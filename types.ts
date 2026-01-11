
export type Gender = '男' | '女' | 'その他';

export interface Student {
  id: string; // 学籍番号
  name: string; // 名前
  subject: string; // 選択科目
  gender: Gender; // 性別
}

export interface Seat {
  row: number;
  col: number;
  student: Student | null;
}

export interface ArrangementConfig {
  rows: number;
  cols: number;
}
