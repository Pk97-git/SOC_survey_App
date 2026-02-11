import { SurveyTemplate } from '../services/configService';

export const SEED_TEMPLATES: SurveyTemplate[] = [
    {
        id: 'tpl_facility_mgmt',
        title: 'Facility Management Inspection',
        sections: [
            {
                id: 'sec_fm_general',
                title: 'General Maintenance',
                questions: [
                    { id: 'q_hvac', label: 'HVAC System Functioning?', type: 'yes_no', required: true },
                    { id: 'q_lighting', label: 'Lighting Adequate?', type: 'yes_no', required: true },
                    { id: 'q_cleaning', label: 'Cleanliness Rating (1-5)', type: 'number' }
                ]
            },
            {
                id: 'sec_fm_safety',
                title: 'Safety Systems',
                questions: [
                    { id: 'q_fire_ext', label: 'Fire Extinguishers Checked?', type: 'yes_no', required: true },
                    { id: 'q_exits', label: 'Emergency Exits Clear?', type: 'yes_no', required: true }
                ]
            }
        ]
    },
    {
        id: 'tpl_drilling',
        title: 'Drilling Site Survey',
        sections: [
            {
                id: 'sec_drill_equip',
                title: 'Rig Equipment',
                questions: [
                    { id: 'q_rig_status', label: 'Rig Operational Status', type: 'text', required: true },
                    { id: 'q_hydraulics', label: 'Hydraulics Leaks?', type: 'yes_no' },
                    { id: 'q_leak_photo', label: 'Leak Photo', type: 'photo', dependsOn: 'q_hydraulics' }
                ]
            },
            {
                id: 'sec_drill_env',
                title: 'Environmental',
                questions: [
                    { id: 'q_spill_kit', label: 'Spill Kits Available?', type: 'yes_no', required: true }
                ]
            }
        ]
    },
    {
        id: 'tpl_oil_waste',
        title: 'Oil Waste Management',
        sections: [
            {
                id: 'sec_waste_storage',
                title: 'Storage Area',
                questions: [
                    { id: 'q_containment', label: 'Secondary Containment Intact?', type: 'yes_no', required: true },
                    { id: 'q_barrels', label: 'Number of Barrels', type: 'number' }
                ]
            },
            {
                id: 'sec_waste_disposal',
                title: 'Disposal Log',
                questions: [
                    { id: 'q_last_pickup', label: 'Last Pickup Date', type: 'date' }
                ]
            }
        ]
    }
];
