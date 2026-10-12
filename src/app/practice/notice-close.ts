import type { AlertNotice } from './controls';

// 枠の「閉じる」が何を閉じるか。保存失敗の枠は自分だけを閉じ、裏の案内（音が出ない・止まった等）は残す（段8 Task 5 fix 1・レビュー I-1）。
export function closeTarget(notice: AlertNotice): 'save-failed' | 'session' {
  return notice === 'save-failed' ? 'save-failed' : 'session';
}
