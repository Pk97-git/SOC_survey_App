import { storage } from './storage';

export const seedDefaultTemplate = async () => {
    const templates = await storage.getTemplates();

    // Only seed if no templates exist
    if (templates.length > 0) {
        return;
    }

    const defaultTemplate = {
        id: 'tpl_default_facility',
        name: 'Facility Inspection',
        file_path: '',
        parsed_structure_json: JSON.stringify({
            mode: 'asset_based',
            description: 'Standard facility inspection template',
            sections: [
                {
                    id: 'sec_safety',
                    title: 'Safety & Hazards',
                    questions: [
                        { id: 'q_safety_1', text: 'Are safety guards in place?', type: 'yes_no', required: true },
                        { id: 'q_safety_2', text: 'Is the area clear of debris?', type: 'yes_no', required: true },
                        { id: 'q_safety_3', text: 'Fire extinguisher accessible?', type: 'yes_no', required: true }
                    ]
                },
                {
                    id: 'sec_equipment',
                    title: 'Equipment Condition',
                    questions: [
                        { id: 'q_equip_1', text: 'Is the motor running smoothly?', type: 'yes_no', required: true },
                        { id: 'q_equip_2', text: 'Any visible leaks?', type: 'yes_no', required: true },
                        { id: 'q_equip_3', text: 'Overall condition rating', type: 'rating', required: false }
                    ]
                },
                {
                    id: 'sec_environment',
                    title: 'Environment',
                    questions: [
                        { id: 'q_env_1', text: 'Is lighting adequate?', type: 'yes_no', required: true },
                        { id: 'q_env_2', text: 'Temperature (°C)', type: 'number', required: false },
                        { id: 'q_env_3', text: 'Ventilation adequate?', type: 'yes_no', required: true }
                    ]
                },
                {
                    id: 'sec_observations',
                    title: 'General Observations',
                    questions: [
                        { id: 'q_obs_1', text: 'Additional notes', type: 'text', required: false }
                    ]
                }
            ]
        }),
        created_at: new Date().toISOString()
    };

    await storage.saveTemplate(defaultTemplate);
    console.log('✅ Default template seeded');
};
