// Application-form answers (e.g. Forma's "I'm here to...") are not part of the business profile. Keep them per browser and
// per provider until the application is created; they travel to /api/draft as existingAnswers.
const key = (token: string, providerId: string) => `wellyfish.qa.${token.slice(0, 8)}.${providerId}`;

export const savedFormAnswers = {
  get: (token: string, providerId: string): { questionId: string; answer: string }[] => {
    try {
      const v = localStorage.getItem(key(token, providerId));
      return v ? (JSON.parse(v) as { questionId: string; answer: string }[]) : [];
    } catch {
      return [];
    }
  },
  set: (token: string, providerId: string, answers: { questionId: string; answer: string }[]) => {
    try { localStorage.setItem(key(token, providerId), JSON.stringify(answers)); } catch { /* storage unavailable */ }
  },
};
