const mongoose = require("mongoose");

// Access your Database Models
const Project = mongoose.model("Project");
const Unit = mongoose.model("Units");

const chat = async (req, res) => {
    try {
        const { question, history, pageContext } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        // Fetch wide context from database
        const [projects, units, clients, invoices, quotes, suppliers] = await Promise.all([
            // Select projectId to link with units
            Project.find({ removed: false }).select("name projectId status totalBudget stakeholderName plannedStartDate targetEndDate"),
            // Select projectId (String) and buildingName
            Unit.find({ removed: false }).select("unitNumber projectId buildingName towerOrWing status unitType totalPrice"),
            mongoose.model("Client").find({ removed: false }).select("name phone email country"),
            mongoose.model("Invoice").find({ removed: false, status: { $ne: 'cancelled' } }).select("number client total status date paymentStatus"),
            mongoose.model("Quote").find({ removed: false }).select("number client total status expiryDate"),
            mongoose.model("Supplier").find({ removed: false }).select("name phone email")
        ]);

        // Construct the prompt
        const prompt = `You are KCC-AI, a Senior ERP Consultant for KCC Infra.
      
CONTEXT DATA:
Projects: ${JSON.stringify(projects)}
Units: ${JSON.stringify(units)}
Clients: ${JSON.stringify(clients)}
Invoices: ${JSON.stringify(invoices)}
Quotes: ${JSON.stringify(quotes)}
Suppliers: ${JSON.stringify(suppliers)}

CURRENT PAGE: ${pageContext || 'Unknown'}

INSTRUCTIONS:
1. **Persona**: Act as a highly capable, executive-level assistant. Be insightful, proactive, and polite.
2. **Visuals**: Use Emojis to categorize information (e.g., 🏗️ for Projects, 🏠 for Units, 💰 for Finance, 👤 for Clients).
3. **Structure**: 
   - Start with a **Brief Summary** or Direct Answer.
   - Use **Markdown Tables** for lists (Columns: Name, Status, Value, etc.).
   - Use **Bold** for important numbers (e.g., **₹50,00,000**).
   - End with a *Proactive Suggestion* if applicable (e.g., "Would you like to email this client?").
4. **Data Linking**:
   - Projects and Units are linked by 'projectId'. Map them correctly.
5. **Context Awareness**: 
   - Use the 'CURRENT PAGE' to understand what the user is looking at.

USER QUESTION: ${question}`;

        // Make direct API call to Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            throw new Error(data.error?.message || "API request failed");
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

        return res.status(200).json({
            success: true,
            result: text,
        });

    } catch (error) {
        console.error("AI Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "AI Service Error",
            error: error.message,
        });
    }
};

module.exports = { chat };