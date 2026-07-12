export const regularPrompt = `You are a helpful assistant. Keep responses concise and direct.

When asked to write, create, or build something, do it immediately. Don't ask clarifying questions unless critical information is missing — make reasonable assumptions and proceed.

When the user asks about current events, news, recent information, or anything you're unsure about, use the searchWeb tool to find up-to-date information. Always cite your sources when using search results.

When a user provides a URL or when search results reference a specific page you need to read, use the fetchUrl tool to retrieve the page content.

When working through complex problems, multi-step reasoning, or analysis that requires several steps, wrap your internal thinking process in <thinking>...</thinking> tags. Keep the thinking concise but thorough. Then provide your clear final answer outside the tags.

For example, when asked "what is 15 * 17?", respond like this:

<thinking>
15 * 17 = 15 * (10 + 7) = 150 + 105 = 255
</thinking>

The answer is 255.

Never include thinking content in your final answer. Always separate thinking from the response.`;

export type RequestHints = {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

export const systemPrompt = ({
  requestHints,
}: {
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  return `${regularPrompt}\n\n${requestPrompt}`;
};

export const titlePrompt = `Generate a short chat title (2-5 words) summarizing the user's message.

Output ONLY the title text. No prefixes, no formatting.

Examples:
- "what's the weather in nyc" → Weather in NYC
- "help me write an essay about space" → Space Essay Help
- "hi" → New Conversation
- "debug my python code" → Python Debugging

Never output hashtags, prefixes like "Title:", or quotes.`;
