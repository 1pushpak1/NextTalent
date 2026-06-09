const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
let cachedS3Client = null;

const isS3UploadEnabled = () => String(process.env.UPLOAD_DISK || '').trim().toLowerCase() === 's3';

const getBucketName = () => String(process.env.AWS_BUCKET || '').trim();

const getRegion = () => String(process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'ap-south-1').trim();

const getS3Client = () => {
  if (!isS3UploadEnabled()) return null;
  if (cachedS3Client) return cachedS3Client;

  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: String(process.env.AWS_ACCESS_KEY_ID).trim(),
          secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
        }
      : undefined;

  cachedS3Client = new S3Client({
    region: getRegion(),
    credentials,
    forcePathStyle: String(process.env.AWS_USE_PATH_STYLE_ENDPOINT || 'false').toLowerCase() === 'true',
  });

  return cachedS3Client;
};

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const sanitizeFilename = (value = 'file') =>
  String(value || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'file';

const joinKey = (...parts) =>
  parts
    .flatMap((part) => String(part || '').split('/'))
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('/');

const buildStorageKey = ({ folder = '', subfolder = '', filename = 'file' } = {}) => {
  const safeName = sanitizeFilename(filename);
  const timestamp = Date.now();
  return joinKey(folder, subfolder, `${timestamp}-${safeName}`);
};

const buildStoredFileUrl = (storageKey) => `/api/files/${encodeURIComponent(String(storageKey || '').trim())}`;

const parseStoredFileUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/api/files/')) {
    return decodeURIComponent(raw.slice('/api/files/'.length));
  }
  if (raw.startsWith('/uploads/')) {
    return raw.replace(/^\/uploads\//, '');
  }
  return raw;
};

const getLocalStoredFilePath = (storageKey) => path.join(uploadsRoot, String(storageKey || '').replace(/^\/+/, ''));

const renderPdfToBuffer = async (build) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    build(doc);
    doc.end();
  });

const storeBuffer = async ({ storageKey, buffer, contentType = 'application/octet-stream' }) => {
  const key = String(storageKey || '').trim();
  if (!key) {
    throw new Error('storageKey is required');
  }
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer is required');
  }

  if (isS3UploadEnabled()) {
    const bucket = getBucketName();
    if (!bucket) throw new Error('AWS_BUCKET is not configured');
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } else {
    const localPath = getLocalStoredFilePath(key);
    ensureDir(path.dirname(localPath));
    fs.writeFileSync(localPath, buffer);
  }

  return {
    storageKey: key,
    fileUrl: buildStoredFileUrl(key),
    localPath: isS3UploadEnabled() ? null : getLocalStoredFilePath(key),
  };
};

const readStoredFileBuffer = async (storedValue) => {
  const value = String(storedValue || '').trim();
  if (!value) return null;

  if (path.isAbsolute(value) && fs.existsSync(value)) {
    return fs.readFileSync(value);
  }

  const storageKey = parseStoredFileUrl(value);
  if (!storageKey) return null;

  if (isS3UploadEnabled()) {
    const bucket = getBucketName();
    if (!bucket) return null;
    const client = getS3Client();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const localPath = getLocalStoredFilePath(storageKey);
  if (!fs.existsSync(localPath)) return null;
  return fs.readFileSync(localPath);
};

const getPresignedDownloadUrl = async (storedValue, expiresIn = 60) => {
  const storageKey = parseStoredFileUrl(storedValue);
  if (!storageKey || !isS3UploadEnabled()) return null;

  const bucket = getBucketName();
  if (!bucket) return null;
  const client = getS3Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), { expiresIn });
};

const serveStoredFile = async (req, res) => {
  try {
    const storageKey = decodeURIComponent(String(req.params?.key || req.params?.[0] || '').trim());
    if (!storageKey) return res.status(404).json({ message: 'File not found' });

    if (isS3UploadEnabled()) {
      const signedUrl = await getPresignedDownloadUrl(storageKey);
      if (!signedUrl) return res.status(404).json({ message: 'File not found' });
      return res.redirect(signedUrl);
    }

    const localPath = getLocalStoredFilePath(storageKey);
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(localPath);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buildStoredAttachment = async (storedValue, filename, contentType = 'application/octet-stream') => {
  if (!storedValue) return null;
  const buffer = await readStoredFileBuffer(storedValue);
  if (!buffer) return null;

  return {
    filename,
    contentType,
    content: buffer,
  };
};

module.exports = {
  buildStorageKey,
  buildStoredAttachment,
  buildStoredFileUrl,
  ensureDir,
  getLocalStoredFilePath,
  isS3UploadEnabled,
  parseStoredFileUrl,
  readStoredFileBuffer,
  renderPdfToBuffer,
  serveStoredFile,
  storeBuffer,
};
