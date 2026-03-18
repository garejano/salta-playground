export interface DataTableConfig {
  customButtomLabel?: boolean;
  buttonColumnLabel?: string;
  columns: ColumnConfig[];
  textLimit?: number;
  buttonLabel?: string;
  buttonsLabels?: string[];
  customButtonLabel?: Function;
  disableButton?: Function;
  filter?:Function;
}

export interface DataTableFilter {
  text: string;
  pending: boolean;
}

export interface ColumnConfig {
  header: string;
  avatar?: boolean;
  highlight?: boolean;
  key?: string;
  multValues?: boolean;
  multValuesWithAvatar?: boolean;
  multValuesWithoutAvatar?: boolean;
  values?: ColumnMultValues[];
  hidden?: any;
  customText?: Function;

}

export interface ColumnMultValues {
  label: string | ((l: any) => string);
  key: string;
  highlight?: boolean;
}
