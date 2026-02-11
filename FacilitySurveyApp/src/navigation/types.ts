export type RootStackParamList = {
    Home: undefined;
    Survey: { templateId: string; surveyId?: string; assetId?: string }; // assetId added
    Review: { surveyId: string };
    ExcelPreview: { surveyId: string };
};
