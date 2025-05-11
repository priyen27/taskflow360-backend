const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.suggestTasks = async (req, res) => {
  const { name, description } = req.body;

  try {
    const prompt = `Suggest 5 relevant task titles for a project. 
Project Name: ${name}
Description: ${description || 'N/A'}
Return only a JSON array of short task titles.`;

    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const tasks = JSON.parse(response.choices[0].message.content);
    res.json({ suggestions: tasks });
  } catch (error) {
    console.error("AI suggestion error:", error);
    res.status(500).json({ message: "Failed to generate task suggestions" });
  }
};
