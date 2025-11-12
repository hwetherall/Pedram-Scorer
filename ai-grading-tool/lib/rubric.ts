export type RubricItem = {
  id: string;
  type: 'section' | 'question' | 'bonus';
  text: string;
  points?: number;
};

export const rubric: RubricItem[] = [
  { id: 'A', type: 'section', text: 'Discover: Understand who you are, and appreciate your strengths and motivations' },
  { id: 'A1', type: 'question', text: 'What sparks joy in your life? Moments of well-being, elation, success or good fortune in your life and work.', points: 1.25 },
  { id: 'A2', type: 'question', text: 'What are your greatest passions and/or goals in life?', points: 1.25 },
  { id: 'A3', type: 'question', text: 'Who is(are) your superhero(s)/role model(s)? Who inspires you to be your BEST? Perhaps a role-model you admire, a family member, public figure, or a fictitious character from a comic book. How would you describe him/her/them?', points: 1.25 },
  { id: 'A4', type: 'question', text: 'What values do you hold that is similar to him/her/them, and what do you aspire to be?', points: 1.25 },
  { id: 'A5', type: 'question', text: "Reflect upon and share a 'wake-up' call experience that sparked growth. Challenges and setbacks help us see more clearly a shift in mindset, perspective or behavior.", points: 1.25 },
  { id: 'B', type: 'section', text: 'Future Map: Articulate your priorities and long-term vision' },
  { id: 'B1', type: 'question', text: 'What does your ideal day look like?', points: 1.25 },
  { id: 'B2', type: 'question', text: 'What are you doing? How are you fulfilling your biggest dreams?', points: 1.25 },
  { id: 'B3', type: 'question', text: 'Where in the world are you living and working? Identify at least three places that you hope to spend time in the future .', points: 1.25 },
  { id: 'B4', type: 'question', text: 'What kind of people are you working with? How will you help them? How will they help you?', points: 1.25 },
  { id: 'B5', type: 'question', text: 'Why is this important to you and what motivated you to embark upon this next journey?', points: 1.25 },
  { id: 'C', type: 'section', text: 'Design: Go To Market Strategy' },
  { id: 'C1', type: 'question', text: 'What is your story?', points: 1.25 },
  { id: 'C2', type: 'question', text: 'Who is your target audience?', points: 1.25 },
  { id: 'C3', type: 'question', text: 'What is your value proposition? What impact will you have in your organization, community, or society?', points: 1.25 },
  { id: 'C4', type: 'question', text: 'What is your positioning statement and how will you communicate it?', points: 1.25 },
  { id: 'C5', type: 'question', text: 'Why would your ‘customer’ choose you?', points: 1.25 },
  { id: 'C_BONUS', type: 'bonus', text: 'BONUS: Did you talk to a potential customer and conducted an informational interview?', points: 1 },
  { id: 'D', type: 'section', text: 'Execution: Make it happen' },
  { id: 'D1', type: 'question', text: 'What potential opportunities are you considering for your career?', points: 1.25 },
  { id: 'D2', type: 'question', text: 'What new domain or market do you want to know better? Which networks do you need to explore? Name 2-3 people whom you would like to connect with to realize your vision.', points: 1.25 },
  { id: 'D3', type: 'question', text: 'Which skill do you want to improve? What 3 things will you commit to do to improve this skill?', points: 1.25 },
  { id: 'D4', type: 'question', text: 'How would each of these opportunities help you accomplish your long-term vision?', points: 1.25 },
  { id: 'D5', type: 'question', text: 'What challenges will you have to conquer as you make your next career move, whether that means looking for a job, starting a new venture, or earning an additional academic degree?', points: 1.25 },
  { id: 'D_BONUS', type: 'bonus', text: 'BONUS: Did you name 2-3 people whom you would like to connect with to realize your vision/ or commit to 3 things to improve your skill/ aid your development', points: 1 },
  { id: 'E', type: 'section', text: 'Overall Quality of the ThriveMap' },
  { id: 'E1', type: 'question', text: 'Effective use of one required book of your choice (from those books listed in the syllabus), as well as frameworks from any of the books, lectures or readings in GEM or ETL', points: 1 },
  { id: 'E2', type: 'question', text: 'Honors 10-page limit (A = within limit, B = 1-2 page over limit, C/D/F = 3 or more pages over limit)', points: 0.75 },
  { id: 'E3', type: 'question', text: 'Spelling, grammar, footnotes, bibliography, etc.', points: 0.75 },
  { id: 'F', type: 'section', text: 'Bonus Points' },
  { id: 'F1', type: 'bonus', text: 'Exceptionally creative format and use of exhibits', points: 0.75 },
  { id: 'F2', type: 'bonus', text: 'Effective use of humor', points: 0.75 },
  { id: 'G', type: 'bonus', text: 'Discussion During Presentation (Enter numeric # between 1-3)', points: 3 },
];

export const rubricIdToLabel = new Map<string, string>(
  rubric.filter(r => r.type !== 'section').map(r => [r.id, r.text])
);

export const rubricIdToPoints = new Map<string, number | undefined>(
  rubric.filter(r => r.type !== 'section').map(r => [r.id, r.points])
);
