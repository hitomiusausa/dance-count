// 文書の言語と題名を表示言語に合わせる（段1持ち越し: index.html の lang="ja" 固定）。
export function applyDocumentLanguage(locale: string, title: string): void {
  document.documentElement.lang = locale;
  document.title = title;
}
