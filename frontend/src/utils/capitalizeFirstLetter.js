export default function capitalizeFirstLetter(value) {
  const text = String(value ?? '');
  const firstNonWhitespaceIndex = text.search(/\S/);

  if (firstNonWhitespaceIndex === -1) return text;

  return (
    text.slice(0, firstNonWhitespaceIndex) +
    text.charAt(firstNonWhitespaceIndex).toUpperCase() +
    text.slice(firstNonWhitespaceIndex + 1)
  );
}
