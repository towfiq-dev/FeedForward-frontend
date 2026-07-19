// import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/lib/auth";

// interface GeminiMessage {
//   role: "user" | "model";
//   parts: { text: string }[];
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { messages } = body;

//     if (!messages || !Array.isArray(messages)) {
//       return NextResponse.json(
//         { error: "Invalid request. 'messages' array is required." },
//         { status: 400 }
//       );
//     }

//     // 1. Get Gemini API Key (either from process.env or x-gemini-key header)
//     const envApiKey = process.env.GEMINI_API_KEY;
//     const headerApiKey = req.headers.get("x-gemini-key");
//     const apiKey = envApiKey || headerApiKey;

//     if (!apiKey) {
//       return NextResponse.json(
//         {
//           error: "API_KEY_MISSING",
//           message: "Gemini API Key is not configured. Please configure GEMINI_API_KEY in your environment or set it in the Chat Assistant settings.",
//         },
//         { status: 400 }
//       );
//     }

//     // 2. Fetch active user session (if any)
//     let userContext = "Anonymous Visitor";
//     let userEmail = "";
//     try {
//       const session = await auth.api.getSession({ headers: req.headers });
//       if (session?.user) {
//         userContext = session.user.name || "User";
//         userEmail = session.user.email || "";
//       }
//     } catch (sessionError) {
//       console.error("Error reading session context:", sessionError);
//     }

//     // 3. Fetch active foods from backend API
//     let activeFoods: any[] = [];
//     let fetchErrorOccurred = false;

//     try {
//       const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
//       const serverUrl = rawServerUrl.replace(/\/+$/, "");
//       const response = await fetch(`${serverUrl}/api/foods?page=1&sort=newest`, {
//         method: "GET",
//         headers: { Accept: "application/json" },
//         next: { revalidate: 30 }, // cache for 30s
//       });

//       if (response.ok) {
//         const parsed = await response.json();
//         if (parsed.success && Array.isArray(parsed.data)) {
//           // Keep only active/available foods and limit details to save token context size
//           activeFoods = parsed.data
//             .filter((f: any) => f.status === "available" || !f.status)
//             .slice(0, 15) // Limit to top 15 foods
//             .map((f: any) => ({
//               id: f._id,
//               name: f.foodName,
//               category: f.category,
//               location: f.location,
//               owner: f.ownerName,
//               expiry: f.expiryDate,
//               servingSize: f.servingSize,
//               halal: f.isHalal ? "Yes" : "No",
//             }));
//         }
//       } else {
//         fetchErrorOccurred = true;
//       }
//     } catch (foodError) {
//       console.error("Error fetching foods from backend server:", foodError);
//       fetchErrorOccurred = true;
//     }

//     // 4. Construct System Instruction
//     const systemPrompt = `You are "ShareBite AI Assistant", a friendly, helpful, and community-minded chatbot for the ShareBite platform.

// ShareBite is a community surplus food-sharing web application. It connects donors (who have safe, extra, edible food) with recipients (nearby community members who need it).

// Key Navigation Routes in the application:
// - Share Food page: [/share-food](/share-food) - where logged-in users can list surplus food.
// - Browse all food items: [/all-foods](/all-foods) - search, filter, and view food.
// - My Shared Foods: [/my-shared-foods](/my-shared-foods) - manage foods they listed.
// - My Requests: [/my-requests](/my-requests) - see the food requests they have sent.
// - Incoming Requests: [/incoming-food-requests](/incoming-food-requests) - see requests sent by others for their food.
// - Support page: [/support](/support) - request platform support.
// - Contact page: [/contact](/contact) - contact the administration.
// - Login page: [/login](/login)
// - Signup page: [/signup](/signup)

// Current User Context:
// - User Status: ${userContext === "Anonymous Visitor" ? "Not logged in (Guest)" : `Logged in as "${userContext}" (${userEmail})`}

// Available Surplus Food Listings (Total loaded: ${activeFoods.length}):
// ${activeFoods.length > 0
//   ? JSON.stringify(activeFoods, null, 2)
//   : "No active food listings could be retrieved or the list is empty."
// }
// ${fetchErrorOccurred ? "Note: We had trouble connecting to the food database server, so listings might be outdated. Explain to the developer that they should ensure their backend server is running on port 5000." : ""}

// Rules for your responses:
// 1. Warmth & Language: Speak in a helpful and warm tone. Respond in the same language as the user's prompt (e.g. if they write in Bengali, reply in Bengali; if in English, reply in English; if code-switching, match their style).
// 2. Food Recommendations: If the user asks about available food, list relevant matches from the database. Format the food items neatly. ALWAYS link the food name to its detail page using the format: [Food Name](/all-foods/id).
// 3. Requesting Food: To request a food, explain that they must click the link to that food item (e.g. [Food Name](/all-foods/id)) and then click the "Request" button on that page. They must be logged in to send requests.
// 4. Navigation: For pages, provide the markdown links (e.g., [Share Food](/share-food)).
// 5. Safety: Emphasize that food must be fresh, safe, and handled hygienically.
// 6. Boundaries: Keep answers focused on ShareBite, food sharing, charity, sustainability, and recipes for surplus food. Keep answers concise.`;

//     // 5. Format message history for Gemini API
//     // Gemini roles: 'user' or 'model'. We map 'assistant' to 'model'.
//     const geminiMessages: GeminiMessage[] = messages
//       .filter((m: any) => m.role === "user" || m.role === "assistant" || m.role === "model")
//       .map((m: any) => ({
//         role: m.role === "assistant" ? "model" : m.role,
//         parts: [{ text: m.content || "" }],
//       }));

//     // 6. Call the Gemini API
//     const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

//     const geminiRes = await fetch(geminiEndpoint, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         contents: geminiMessages,
//         systemInstruction: {
//           parts: [{ text: systemPrompt }],
//         },
//         generationConfig: {
//           temperature: 0.7,
//           maxOutputTokens: 1000,
//         },
//       }),
//     });

//     if (!geminiRes.ok) {
//       const errorText = await geminiRes.text();
//       console.error("Gemini API Error Response:", errorText);
//       return NextResponse.json(
//         { error: "GEMINI_API_ERROR", message: "Failed to fetch response from Gemini API." },
//         { status: geminiRes.status }
//       );
//     }

//     const result = await geminiRes.json();
//     const assistantReply = result.candidates?.[0]?.content?.parts?.[0]?.text;

//     if (!assistantReply) {
//       return NextResponse.json(
//         { error: "EMPTY_RESPONSE", message: "Gemini returned an empty reply." },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({ reply: assistantReply });

//   } catch (error: any) {
//     console.error("Chat API Route Error:", error);
//     return NextResponse.json(
//       { error: "INTERNAL_SERVER_ERROR", message: error.message || "An unexpected error occurred." },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request. 'messages' array is required." },
        { status: 400 }
      );
    }

    // 1. Get Gemini API Key (either from process.env or x-gemini-key header)
    const envApiKey = process.env.GEMINI_API_KEY;
    const headerApiKey = req.headers.get("x-gemini-key");
    const apiKey = envApiKey || headerApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message: "Gemini API Key is not configured. Please configure GEMINI_API_KEY in your environment or set it in the Chat Assistant settings.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch active user session (if any)
    let userContext = "Anonymous Visitor";
    let userEmail = "";
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user) {
        userContext = session.user.name || "User";
        userEmail = session.user.email || "";
      }
    } catch (sessionError) {
      console.error("Error reading session context:", sessionError);
    }

    // 3. Fetch active foods from backend API
    let activeFoods: any[] = [];
    let fetchErrorOccurred = false;

    try {
      const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
      const serverUrl = rawServerUrl.replace(/\/+$/, "");
      const response = await fetch(`${serverUrl}/api/foods?page=1&sort=newest`, {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 30 }, // cache for 30s
      });

      if (response.ok) {
        const parsed = await response.json();
        if (parsed.success && Array.isArray(parsed.data)) {
          // Keep only active/available foods and limit details to save token context size
          activeFoods = parsed.data
            .filter((f: any) => f.status === "available" || !f.status)
            .slice(0, 15) // Limit to top 15 foods
            .map((f: any) => ({
              id: f._id,
              name: f.foodName,
              category: f.category,
              location: f.location,
              owner: f.ownerName,
              expiry: f.expiryDate,
              servingSize: f.servingSize,
              halal: f.isHalal ? "Yes" : "No",
            }));
        }
      } else {
        fetchErrorOccurred = true;
      }
    } catch (foodError) {
      console.error("Error fetching foods from backend server:", foodError);
      fetchErrorOccurred = true;
    }

    // 4. Construct System Instruction
    const systemPrompt = `You are "ShareBite AI Assistant", a friendly, helpful, and community-minded chatbot for the ShareBite platform.

ShareBite is a community surplus food-sharing web application. It connects donors (who have safe, extra, edible food) with recipients (nearby community members who need it).

Key Navigation Routes in the application:
- Share Food page: [/share-food](/share-food) - where logged-in users can list surplus food.
- Browse all food items: [/all-foods](/all-foods) - search, filter, and view food.
- My Shared Foods: [/my-shared-foods](/my-shared-foods) - manage foods they listed.
- My Requests: [/my-requests](/my-requests) - see the food requests they have sent.
- Incoming Requests: [/incoming-food-requests](/incoming-food-requests) - see requests sent by others for their food.
- Support page: [/support](/support) - request platform support.
- Contact page: [/contact](/contact) - contact the administration.
- Login page: [/login](/login)
- Signup page: [/signup](/signup)

Current User Context:
- User Status: ${userContext === "Anonymous Visitor" ? "Not logged in (Guest)" : `Logged in as "${userContext}" (${userEmail})`}

Available Surplus Food Listings (Total loaded: ${activeFoods.length}):
${activeFoods.length > 0
  ? JSON.stringify(activeFoods, null, 2)
  : "No active food listings could be retrieved or the list is empty."
}
${fetchErrorOccurred ? "Note: We had trouble connecting to the food database server, so listings might be outdated. Explain to the developer that they should ensure their backend server is running on port 5000." : ""}

Rules for your responses:
1. Warmth & Language: Speak in a helpful and warm tone. Respond in the same language as the user's prompt (e.g. if they write in Bengali, reply in Bengali; if in English, reply in English; if code-switching, match their style).
2. Food Recommendations: If the user asks about available food, list relevant matches from the database. Format the food items neatly. ALWAYS link the food name to its detail page using the format: [Food Name](/all-foods/id).
3. Requesting Food: To request a food, explain that they must click the link to that food item (e.g. [Food Name](/all-foods/id)) and then click the "Request" button on that page. They must be logged in to send requests.
4. Navigation: For pages, provide the markdown links (e.g., [Share Food](/share-food)).
5. Safety: Emphasize that food must be fresh, safe, and handled hygienically.
6. Boundaries: Keep answers focused on ShareBite, food sharing, charity, sustainability, and recipes for surplus food. Keep answers concise.`;

    // 5. Format message history for Gemini API
    // Gemini roles: 'user' or 'model'. We map 'assistant' to 'model'.
    const geminiMessages: GeminiMessage[] = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant" || m.role === "model")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content || "" }],
      }));

    // 6. Call the Gemini API
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API Error Response:", errorText);
      return NextResponse.json(
        { error: "GEMINI_API_ERROR", message: "Failed to fetch response from Gemini API." },
        { status: geminiRes.status }
      );
    }

    const result = await geminiRes.json();
    const assistantReply = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!assistantReply) {
      return NextResponse.json(
        { error: "EMPTY_RESPONSE", message: "Gemini returned an empty reply." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: assistantReply });

  } catch (error: any) {
    console.error("Chat API Route Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
