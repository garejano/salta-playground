import { EnumValidationErrorType } from "./enum-errorTypes.model";

export interface IExceptionFormError {
    type: EnumValidationErrorType;
    messages: IExceptionFormErrorMessage[];
}

export interface IExceptionFormErrorMessage {
    property: string;
    error: string;
}

export interface IExceptionCommonError {
    type: EnumValidationErrorType;
    message: string;
}

export interface IExceptionImportError {
    type: EnumValidationErrorType;
    messages: IExceptionImportErrorMessage[];
}

export interface IExceptionImportErrorMessage {
    linha: string;
    propriedade: string;
    valor: any;
    descricao: string;
}
