export const WORK_TASK_CONFIG = {
    "Mivan": ["Mivan Centering", "Slab Beam Reinforcement"],
    "Electrical Work-I": ["Slab Piping", "Ziri Cutting + Pipe fitting", "Conselled box fitting", "Block Wiring", "Switch Plate fitting", "Testing Repair & Finish", "Final Testing"],
    "Electrical Work-E": ["Block to parking meter panel pipe fitting", "Block to parking meter panel wiring", "Block Panel Fitting", "Testing"],
    "Water Proofing": ["Chipping & Leakage Pipe", "First Coat", "Koba filling & Finishing", "Wash up pipe & Concrete Finish"],
    "Plumbing-I": ["Slab Pipeing", "Zari Cutting + Holes", "Internal Pipe Line Fitting", "Zari Repairing & Testing", "Nani trap fitting", "Show Fitting"],
    "Plumbing-E": ["Rain Water Line Fitting", "Toilet Outlet Pipe Fitting", "Kichen & Bal Outlet pipe Fitting", "Water Supply Line", "Ground Water Tank To Overhead", "Additional Work"],
    "Tiles": ["Floor", "Floor Scurting", "Balcony Floor", "Balcony Wall", "Kitchen- Wall", "Kitchen- Otta", "Window Seal", "Kadapa Rack", "Toilet-1 Floor", "Toilet-1 Wall", "Toilet-2 Floor", "Toilet-2 Wall", "Toilet-3 Floor", "Toilet-3 Wall", "Acid Wash", "Extra Work"],
    "POP": ["Dhar & Line finishing of beam and column", "False Ceiling", "Metal Framing", "Sheet fitting & Finishing", "Electric Hole Cutting"],
    "Civil Work": ["CW-Hall", "CW-Balcony", "CW-Kitchen", "CW-Toilet1", "CW-Toilet2", "CW-Toilet3", "CW-Bedroom1", "CW-Bedroom2", "CW-Bedroom3"],
    "Civil Work (Loft Centering)": ["LC-Hall", "LC-Balcony", "LC-Kitchen", "LC-Toilet1", "LC-Toilet2", "LC-Toilet3", "LC-Bedroom1", "LC-Bedroom2", "LC-Bedroom3"],
    "Civil Work (Loft Casting)": ["LCast-Hall", "LCast-Balcony", "LCast-Kitchen", "LCast-Toilet1", "LCast-Toilet2", "LCast-Toilet3", "LCast-Bedroom1", "LCast-Bedroom2", "LCast-Bedroom3"],
    "Fabrication Work": ["Grill Fitting", "Railing Fixing", "Gate Fixing"],
    "Painting": ["Grinding", "Putti-1", "Putti-2 (Final Base)", "Primer/Gasai", "Paint Coat-1", "Paint Coat-2", "O Paint =Door+Grill+Chaukat+Railing", "Cleaning 100%", "Texture"],
    "Finishing-W": ["FW-Hall", "FW-Balcony", "FW-Kitchen", "FW-Toilet-1", "FW-Toilet-2", "FW-Toilet-3", "FW-BedRoom-1", "FW-BedRoom-2", "FW-BedRoom-3"],
    "Finishing-D": ["FD-Hall", "FD-Balcony", "FD-Kitchen", "FD-Toilet1", "FD-Toilet2", "FD-Toilet3", "FD-Bedroom1", "FD-Bedroom2", "FD-Bedroom3"]
};

export const COMPLEX_TASK_COMPONENTS = {
    // Mivan
    "Mivan Centering": "MivanCenteringForm",
    "Slab Beam Reinforcement": "SlabReinforcementForm",
    // Electrical Work-I
    "Slab Piping": "ElectricalWorkIForm",
    "Ziri Cutting + Pipe fitting": "ElectricalWorkIForm",
    "Conselled box fitting": "ElectricalWorkIForm",
    "Block Wiring": "ElectricalWorkIForm",
    "Switch Plate fitting": "ElectricalWorkIForm",
    "Testing Repair & Finish": "ElectricalWorkIForm",
    "Final Testing": "ElectricalWorkIForm",
    // Electrical Work-E
    "Block to parking meter panel pipe fitting": "ElectricalWorkEForm",
    "Block to parking meter panel wiring": "ElectricalWorkEForm",
    "Block Panel Fitting": "ElectricalWorkEForm",
    "Testing": "ElectricalWorkEForm",
    // Water Proofing
    "Chipping & Leakage Pipe": "WaterProofingForm",
    "First Coat": "WaterProofingForm",
    "Koba filling & Finishing": "WaterProofingForm",
    "Wash up pipe & Concrete Finish": "WaterProofingForm",
    // Plumbing-I
    "Slab Pipeing": "PlumbingForm",
    "Zari Cutting + Holes": "PlumbingForm",
    "Internal Pipe Line Fitting": "PlumbingForm",
    "Zari Repairing & Testing": "PlumbingIExtraForm",
    "Nani trap fitting": "PlumbingIExtraForm",
    "Show Fitting": "PlumbingIExtraForm",
    // Plumbing-E
    "Rain Water Line Fitting": "PlumbingEForm",
    "Toilet Outlet Pipe Fitting": "PlumbingEForm",
    "Kichen & Bal Outlet pipe Fitting": "PlumbingEForm",
    "Water Supply Line": "PlumbingEForm",
    "Ground Water Tank To Overhead": "PlumbingEForm",
    "Additional Work": "PlumbingEForm",
    // Tiles
    "Floor": "TilesForm",
    "Kitchen- Wall": "TilesForm",
    "Toilet-1 Wall": "TilesForm",
    "Floor Scurting": "TilesExtraForm",
    "Balcony Floor": "TilesExtraForm",
    "Balcony Wall": "TilesExtraForm",
    "Kitchen- Otta": "TilesExtraForm",
    "Window Seal": "TilesExtraForm",
    "Kadapa Rack": "TilesExtraForm",
    "Toilet-2 Floor": "TilesExtraForm",
    "Toilet-2 Wall": "TilesExtraForm",
    "Toilet-3 Floor": "TilesExtraForm",
    "Toilet-3 Wall": "TilesExtraForm",
    "Acid Wash": "TilesExtraForm",
    // POP
    "Dhar & Line finishing of beam and column": "POPForm",
    "False Ceiling": "POPForm",
    "Metal Framing": "POPForm",
    "Sheet fitting & Finishing": "POPForm",
    "Electric Hole Cutting": "POPForm",
    // Civil Work (generic)
    "CW-Hall": "CivilWorkForm",
    "CW-Balcony": "CivilWorkForm",
    "CW-Kitchen": "CivilWorkForm",
    "CW-Toilet1": "CivilWorkForm",
    "CW-Toilet2": "CivilWorkForm",
    "CW-Toilet3": "CivilWorkForm",
    "CW-Bedroom1": "CivilWorkForm",
    "CW-Bedroom2": "CivilWorkForm",
    "CW-Bedroom3": "CivilWorkForm",
    // Civil Work (Loft Centering)
    "LC-Hall": "CivilWorkForm",
    "LC-Balcony": "CivilWorkForm",
    "LC-Kitchen": "CivilWorkForm",
    "LC-Toilet1": "CivilWorkForm",
    "LC-Toilet2": "CivilWorkForm",
    "LC-Toilet3": "CivilWorkForm",
    "LC-Bedroom1": "CivilWorkForm",
    "LC-Bedroom2": "CivilWorkForm",
    "LC-Bedroom3": "CivilWorkForm",
    // Civil Work (Loft Casting)
    "LCast-Hall": "CivilWorkForm",
    "LCast-Balcony": "CivilWorkForm",
    "LCast-Kitchen": "CivilWorkForm",
    "LCast-Toilet1": "CivilWorkForm",
    "LCast-Toilet2": "CivilWorkForm",
    "LCast-Toilet3": "CivilWorkForm",
    "LCast-Bedroom1": "CivilWorkForm",
    "LCast-Bedroom2": "CivilWorkForm",
    "LCast-Bedroom3": "CivilWorkForm",
    // Fabrication Work
    "Grill Fitting": "FabricationForm",
    "Railing Fixing": "FabricationForm",
    "Gate Fixing": "FabricationForm",
    // Painting
    "Grinding": "PaintingForm",
    "Putti-1": "PaintingForm",
    "Putti-2 (Final Base)": "PaintingForm",
    "Primer/Gasai": "PaintingForm",
    "Paint Coat-1": "PaintingForm",
    "Paint Coat-2": "PaintingForm",
    "O Paint =Door+Grill+Chaukat+Railing": "PaintingForm",
    "Cleaning 100%": "PaintingForm",
    "Texture": "PaintingForm",
    // Finishing-W (Aluminium Windows)
    "FW-Hall": "FinishingWForm",
    "FW-Balcony": "FinishingWForm",
    "FW-Kitchen": "FinishingWForm",
    "FW-Toilet-1": "FinishingWForm",
    "FW-Toilet-2": "FinishingWForm",
    "FW-Toilet-3": "FinishingWForm",
    "FW-BedRoom-1": "FinishingWForm",
    "FW-BedRoom-2": "FinishingWForm",
    "FW-BedRoom-3": "FinishingWForm",
    // Finishing-D (Door Panels)
    "FD-Hall": "FinishingDForm",
    "FD-Balcony": "FinishingDForm",
    "FD-Kitchen": "FinishingDForm",
    "FD-Toilet1": "FinishingDForm",
    "FD-Toilet2": "FinishingDForm",
    "FD-Toilet3": "FinishingDForm",
    "FD-Bedroom1": "FinishingDForm",
    "FD-Bedroom2": "FinishingDForm",
    "FD-Bedroom3": "FinishingDForm",
};

/**
 * Maps workConfig task names to possible DB subCategory values (Excel/import naming).
 * Set Rate and Planning use this for fuzzy rate lookup when exact match fails.
 */
export const SUB_CATEGORY_ALIASES = {
    // Electrical
    "Testing Repair & Finish": ["Testing Repair & Finish", "Testing Final Repair & Finish"],
    "Block to parking meter panel pipe fitting": ["Block to parking meter panel pipe fitting", "Meter drop to isolator"],
    "Block to parking meter panel wiring": ["Block to parking meter panel wiring"],
    "Block Panel Fitting": ["Block Panel Fitting"],
    "Testing": ["Testing", "Final Testing"],
    // Plumbing
    "Slab Pipeing": ["Slab Pipeing", "Slab Piping"],
    "Zari Cutting + Holes": ["Zari Cutting + Holes", "Ziri Cutting + Pipe fitting"],
    "Nani trap fitting": ["Nani trap fitting", "Nani trap fitting ", "Sluice"],
    "Show Fitting": ["Show Fitting", "Show fitting (commode, basin, cistern) + Water meter"],
    // Tiles
    "Floor": ["Floor", "Floor,Wall Tiles ", "Floor,Wall Tiles"],
    "Floor Scurting": ["Floor Scurting", "Floor  scurting"],
    "Balcony Wall": ["Balcony Wall", "Wash- wall"],
    // Water Proofing
    "First Coat": ["First Coat", "Chipping & Leakage Pipe"],
    "Wash up pipe & Concrete Finish": ["Wash up pipe & Concrete Finish"],
    // Painting
    "Grinding": ["Grinding", "Granding (1.0/sft)"],
    "Texture": ["Texture", "Texture (1.0/ sft)"],
    // POP
    "Electric Hole Cutting": ["Electric Hole Cutting", "Electric Hole Cutting "],
    // Civil
    "CW-Hall": ["CW-Hall", "Hall", "Door Frame Fitting"],
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
    { id: "8", label: "Civil Work (Loft Centering)", fields: WORK_TASK_CONFIG["Civil Work (Loft Centering)"] },
    { id: "8b", label: "Civil Work (Loft Casting)", fields: WORK_TASK_CONFIG["Civil Work (Loft Casting)"] },
    { id: "9", label: "Fabrication Work", fields: WORK_TASK_CONFIG["Fabrication Work"] },
    { id: "10", label: "Painting", fields: WORK_TASK_CONFIG["Painting"] },
    { id: "11", label: "Finishing-W", fields: WORK_TASK_CONFIG["Finishing-W"] },
    { id: "12", label: "Finishing-D", fields: WORK_TASK_CONFIG["Finishing-D"] },
    { id: "ex", label: "Extra Work", fields: ["Extra Work"] },
];

/**
 * Maps WORK_CATEGORIES labels to contractor workType values that should be shown.
 * Matching is case-insensitive / trimmed.
 * null = show ALL contractors (used for "Extra Work").
 */
export const WORK_TYPE_TO_CONTRACTOR_TYPES = {
    "Mivan": ["Mivan", "Civil"],
    "Electrical Work-I": ["Electrical Work-I", "Electrical Work-I/E"],
    "Electrical Work-E": ["Electrical Work-E", "Electrical Work-I/E"],
    "Water Proofing": ["Water Proofing"],
    "Plumbing-I": ["Plumbing-I", "Plumbing-I/E"],
    "Plumbing-E": ["Plumbing-E", "Plumbing-I/E"],
    "Tiles": ["Tiles", "Tile Work"],
    "POP": ["POP"],
    "Civil Work (Loft Centering)": ["Civil", "Civil Work"],
    "Civil Work (Loft Casting)": ["Civil", "Civil Work"],
    "Fabrication Work": ["Fabrication Work"],
    "Painting": ["Painting"],
    "Finishing-W": ["Finishing-W", "Finishing- W"],
    "Finishing-D": ["Finishing-D"],
    "Extra Work": null,
};
