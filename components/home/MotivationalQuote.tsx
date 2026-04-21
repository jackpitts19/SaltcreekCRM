"use client";

import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

const QUOTES = [
  // Warren Buffett
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "Be fearful when others are greedy and greedy when others are fearful.", author: "Warren Buffett" },
  { text: "Someone's sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "It takes 20 years to build a reputation and five minutes to ruin it.", author: "Warren Buffett" },
  // Charlie Munger
  { text: "Show me the incentive and I'll show you the outcome.", author: "Charlie Munger" },
  { text: "The best thing a human being can do is to help another human being know more.", author: "Charlie Munger" },
  { text: "Invert, always invert.", author: "Charlie Munger" },
  // Finance & Markets
  { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { text: "Time in the market beats timing the market.", author: "Ken Fisher" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  // Hustle & Hard Work
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice.", author: "Pelé" },
  { text: "Without hustle, talent will only carry you so far.", author: "Gary Vaynerchuk" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
  { text: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { text: "Grind now. Shine later.", author: "Eric Thomas" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "Stay hard.", author: "David Goggins" },
  // Leadership & Business
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "You don't find the will to win; you find the will to prepare to win.", author: "Bobby Knight" },
  { text: "If you are not willing to risk the unusual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "We must all suffer one of two things: the pain of discipline or the pain of regret.", author: "Jim Rohn" },
  // Wisdom & Mindset
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  // Elon Musk
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { text: "If something is important enough, even if the odds are against you, you should still do it.", author: "Elon Musk" },
  { text: "The first step is to establish that something is possible; then probability will occur.", author: "Elon Musk" },
  // Sales & Relationship
  { text: "Your network is your net worth.", author: "Porter Gale" },
  { text: "People don't buy what you do; they buy why you do it.", author: "Simon Sinek" },
  { text: "Make a customer, not a sale.", author: "Katherine Barchetti" },
  { text: "Every sale has five basic obstacles: no need, no money, no hurry, no desire, no trust.", author: "Zig Ziglar" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  // Miscellaneous greats
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { text: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
  { text: "Whatever the mind can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "The secret of success is to do the common thing uncommonly well.", author: "John D. Rockefeller Jr." },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
];

// Rotates every 4 hours — deterministic based on epoch
function getQuoteIndex(): number {
  const fourHourBlocks = Math.floor(Date.now() / (1000 * 60 * 60 * 4));
  return fourHourBlocks % QUOTES.length;
}

export default function MotivationalQuote() {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    setIdx(getQuoteIndex());
  }, []);

  if (idx === null) return null;

  const quote = QUOTES[idx];

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 border border-slate-700">
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />

      <div className="relative flex gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Quote size={15} className="text-blue-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm font-medium leading-relaxed">
            {quote.text}
          </p>
          <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide uppercase">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
}
