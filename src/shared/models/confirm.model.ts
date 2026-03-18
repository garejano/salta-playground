export interface IConfirmModel {
  message: string;
  textOk: string;
  textCancel?: string;
  siFn?: () => void;
  noFn?: () => void;
  title?: string;
  description?: string;
}
