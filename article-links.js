// Render HTTPS Markdown links without allowing HTML in the label or URL.
export function renderArticleLinks(text, renderText, escapeHtml) {
  const source = String(text ?? '');
  const links = /\[([^\]\r\n]+)\]\((https:\/\/[^\s()]+)\)/gi;
  let html = '';
  let offset = 0;

  for (const match of source.matchAll(links)) {
    const [markup, label, address] = match;
    let url;
    try {
      url = new URL(address);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || url.username || url.password) continue;

    html += renderText(source.slice(offset, match.index));
    html += `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    offset = match.index + markup.length;
  }

  return html + renderText(source.slice(offset));
}
