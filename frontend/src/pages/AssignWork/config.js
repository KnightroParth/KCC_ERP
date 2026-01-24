export const WORK_TASK_CONFIG = {
    "Mivan": ["Mivan Centering", "Slab Beam Reinforcement"],
    "Electrical Work-I": ["Slab Piping", "Ziri Cutting + Pipe fitting", "Conselled box fitting", "Block Wiring", "Switch Plate fitting", "Testing Repair & Finish", "Final Testing"],
    "Electrical Work-E": ["Block to parking meter panel pipe fitting", "Block to parking meter panel wiring", "Block Panel Fitting", "Testing"],
    "Water Proofing": ["Chipping & Leakage Pipe", "First Coat", "Koba filling & Finishing", "Wash up pipe & Concrete Finish"],
    "Plumbing-I": ["Slab Pipeing", "Zari Cutting + Holes", "Internal Pipe Line Fitting", "Zari Repairing & Testing", "Nani trap fitting", "Show Fitting"],
    "Plumbing-E": ["Rain Water Line Fitting", "Toilet Outlet Pipe Fitting", "Kichen & Bal Outlet pipe Fitting", "Water Supply Line", "Ground Water Tank To Overhead", "Additional Work"],
    "Tiles": ["Floor", "Floor Scurting", "Balcony Floor", "Balcony Wall", "Kitchen- Wall", "Kitchen- Otta", "Window Seal", "Kadapa Rack", "Toilet-1 Floor", "Toilet-1 Wall", "Toilet-2 Floor", "Toilet-2 Wall", "Toilet-3 Floor", "Toilet-3 Wall", "Acid Wash", "Extra Work"],
    "POP": ["Dhar & Line finishing of beam and column", "False Ceiling", "Metal Framing", "Sheet fitting & Finishing", "Electric Hole Cutting"],
    "Civil Work": ["Hall", "Balcony", "Kitchen", "Toilet1", "Toilet2", "Toilet3", "Bedroom1", "Bedroom2", "Bedroom3"],
    "Fabrication Work": ["Grill Fitting", "Railing Fixing", "Gate Fixing"],
    "Painting": ["Grinding", "Putti-1", "Putti-2 (Final Base)", "Primer/Gasai", "Paint Coat-1", "Paint Coat-2", "O Paint =Door+Grill+Chaukat+Railing", "Cleaning 100%", "Texture"],
    "Finishing-W": ["Hall", "Balcony", "Kitchen", "Toilet-1", "Toilet-2", "Toilet-3", "BedRoom-1", "BedRoom-2", "BedRoom-3"],
    "Finishing-D": ["Hall", "Balcony", "Kitchen", "Toilet1", "Toilet2", "Toilet3", "Bedroom1", "Bedroom2", "Bedroom3"]
};

export const COMPLEX_TASK_COMPONENTS = {
    "Mivan Centering": "MivanCenteringForm",
    "Slab Beam Reinforcement": "SlabReinforcementForm",
    "Slab Piping": "ElectricalWorkIForm",
    "Conselled box fitting": "ElectricalWorkIForm",
    "Block Wiring": "ElectricalWorkIForm",
    "Switch Plate fitting": "ElectricalWorkIForm",
    "Testing Repair & Finish": "ElectricalWorkIForm",
    "Block to parking meter panel pipe fitting": "ElectricalWorkEForm",
    "Block to parking meter panel wiring": "ElectricalWorkEForm",
    "Block Panel Fitting": "ElectricalWorkEForm",
};

export const WORK_CATEGORIES = [
    { id: "0", label: "Mivan", fields: WORK_TASK_CONFIG["Mivan"] },
    { id: "1", label: "Electrical Work-I", fields: WORK_TASK_CONFIG["Electrical Work-I"] },
    { id: "2", label: "Electrical Work-E", fields: WORK_TASK_CONFIG["Electrical Work-E"] },
    { id: "3", label: "Water Proofing", fields: WORK_TASK_CONFIG["Water Proofing"] },
    { id: "4", label: "Plumbing-I", fields: WORK_TASK_CONFIG["Plumbing-I"] },
    { id: "5", label: "Plumbing-E", fields: WORK_TASK_CONFIG["Plumbing-E"] },
    { id: "6", label: "Tiles", fields: WORK_TASK_CONFIG["Tiles"] },
    { id: "7", label: "POP", fields: WORK_TASK_CONFIG["POP"] },
    { id: "8", label: "Civil Work", fields: WORK_TASK_CONFIG["Civil Work"] },
    { id: "9", label: "Fabrication Work", fields: WORK_TASK_CONFIG["Fabrication Work"] },
    { id: "10", label: "Painting", fields: WORK_TASK_CONFIG["Painting"] },
    { id: "11", label: "Finishing-W", fields: WORK_TASK_CONFIG["Finishing-W"] },
    { id: "12", label: "Finishing-D", fields: WORK_TASK_CONFIG["Finishing-D"] },
];
