interface IAction {
    name: string;
    allowedInSpecial: null | boolean;
    fields: string[];
    conditions: string[];
}
export class CreateUserFeatureActionDto {
    userId: number;
    features: {
        name: string;
        actions: IAction[];
    }[];
}
