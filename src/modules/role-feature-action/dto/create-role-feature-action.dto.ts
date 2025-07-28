interface IAction {
    name: string;
    fields: string[];
    conditions: string[];
}
export class CreateRoleFeatureActionDto {
    roleName: string;
    features: {
        name: string;
        actions: IAction[];
    }[];
}
