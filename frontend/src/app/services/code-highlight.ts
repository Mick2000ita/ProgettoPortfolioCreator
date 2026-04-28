import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { CodeLanguageId } from './portfolio-editor-state.service';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('python', python);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

const LANGUAGE_MAP: Record<CodeLanguageId, string> = {
  plaintext: 'plaintext',
  typescript: 'typescript',
  javascript: 'javascript',
  html: 'xml',
  css: 'css',
  scss: 'scss',
  json: 'json',
  bash: 'bash',
  python: 'python',
  java: 'java',
  sql: 'sql',
};

export function renderHighlightedCode(code: string, language: CodeLanguageId) {
  const normalizedCode = code ?? '';
  const highlightLanguage = LANGUAGE_MAP[language] ?? 'plaintext';

  try {
    return hljs.highlight(normalizedCode, { language: highlightLanguage }).value;
  } catch {
    return hljs.highlight(normalizedCode, { language: 'plaintext' }).value;
  }
}
