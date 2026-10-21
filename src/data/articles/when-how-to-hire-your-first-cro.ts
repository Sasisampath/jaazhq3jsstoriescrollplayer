import type { EpisodeArticle } from "../episodes";

/* Episode notes for FIRST TAKE Ep. 2, from the supplied article
   "Medium blog - When & How to Hire Your First CRO". */

const FIGURES = "/stories/when-how-to-hire-your-first-cro";

export const whenHowToHireYourFirstCro: EpisodeArticle = {
  dek: "MKB on moving beyond founder-led sales, using fractional leadership, building repeatable GTM systems, and why founders should move up in sales — not away from it.",
  sections: [
    {
      id: "introduction",
      navLabel: "Introduction",
      blocks: [
        { type: "paragraph", text: "Getting to your first few million in revenue often looks very different from getting to the next ten." },
        {
          type: "paragraph",
          text: "In the early days, the founder can carry a surprising amount of the company on their shoulders: finding customers, running demos, closing deals, handling objections, and learning directly from every conversation.",
        },
        { type: "paragraph", text: "That works — until it doesn't scale." },
        {
          type: "paragraph",
          text: "In Episode 2 of First Take by JazzHQ, Krish sits down with MK Balaji (MKB), former CRO at SeamlessHR and an early GTM leader across Frillp and Freshworks/Freshchat, to unpack what needs to change once founder-led growth starts becoming a system problem.",
        },
        {
          type: "paragraph",
          text: "MKB has worked across the $0–$20M journey multiple times. He describes Freshchat scaling from roughly $1M to $20M and his more recent CRO journey at SeamlessHR from roughly $2M to $15M.",
        },
        { type: "paragraph", text: "The conversation isn't really about hiring someone with CRO in their LinkedIn title." },
        { type: "paragraph", text: "It's about knowing when your company is actually ready for one." },
      ],
    },
    {
      id: "building-products-people-care-about",
      heading: "Building products got easier. Building products people care about didn't.",
      blocks: [
        { type: "paragraph", text: "AI has dramatically lowered the barrier to creating software." },
        { type: "paragraph", text: "But MKB argues that this hasn't necessarily made building a *great* product easier." },
        { type: "paragraph", text: "Quite the opposite." },
        { type: "paragraph", text: "When nearly anyone can ship, the challenge becomes standing out from everything else being shipped." },
        { type: "paragraph", text: "His way of thinking about product demand can be reduced to four variables:" },
        { type: "callout", text: "Need intensity × Urgency × Relevance × Trust" },
        { type: "paragraph", text: "And importantly, he treats it as multiplication rather than addition." },
        { type: "paragraph", text: "If one part becomes zero, the entire equation becomes zero." },
        {
          type: "figure",
          src: `${FIGURES}/product-demand-multiplier.jpg`,
          alt: "The Product Demand Multiplier: Need intensity × Urgency × Relevance × Trust = Demand. If one becomes zero, the whole equation becomes zero.",
          width: 1448,
          height: 1086,
        },
      ],
    },
    {
      id: "hire-someone-who-can-diagnose",
      heading: "Don't hire a playbook. Hire someone who can diagnose.",
      blocks: [
        { type: "paragraph", text: "When SeamlessHR first approached MKB, he didn't immediately join as a full-time CRO." },
        { type: "paragraph", text: "He started fractionally." },
        {
          type: "paragraph",
          text: "MKB describes fractional leadership as a way for both the founder and executive to test the relationship before making a high-cost leadership decision.",
        },
        {
          type: "paragraph",
          text: "At an executive level, a bad hire doesn't only affect a revenue target. It can affect the people and culture that took years to build.",
        },
        { type: "paragraph", text: "But his bigger point is about how a fractional leader should enter the company." },
        { type: "paragraph", text: "Not with:" },
        { type: "quote", text: "“This worked at my previous company, so let's do it here.”" },
        { type: "paragraph", text: "But with a diagnostic mindset." },
        {
          type: "list",
          items: [
            "Understand the product.",
            "Understand the customers.",
            "Understand the market.",
            "Understand the existing sales motion.",
            "Understand what's already working.",
          ],
        },
        { type: "paragraph", text: "Then decide what needs to change." },
        {
          type: "podcast",
          text: "Hear MKB explain why fractional leadership should start with diagnosis rather than a pre-built playbook.",
          at: "14:03",
        },
      ],
    },
    {
      id: "when-to-hire-a-cro",
      heading: "So when should you actually hire a CRO?",
      blocks: [
        { type: "paragraph", text: "This is where the conversation gets especially useful for early-stage founders." },
        { type: "paragraph", text: "MKB doesn't recommend bringing in a fractional revenue leader as your **first salesperson**." },
        { type: "paragraph", text: "First, the company needs to learn how to sell." },
        { type: "paragraph", text: "The founder and early team need to discover something repeatable." },
        { type: "paragraph", text: "Once those repeatable selling models begin to emerge, leadership becomes a different problem." },
        { type: "paragraph", text: "You're no longer asking:" },
        { type: "quote", text: "“Can we sell this?”" },
        { type: "paragraph", text: "You're starting to ask:" },
        { type: "quote", text: "“How do we turn the way we're selling this into a system?”" },
        { type: "paragraph", text: "That's where experienced revenue leadership starts becoming useful." },
        { type: "paragraph", text: "As MKB puts it, founder heroics aren't going to take a company from roughly $3M to $10M." },
        { type: "pullquote", text: "“Don't hire someone to scale what you haven't learned how to repeat.”" },
        {
          type: "figure",
          src: `${FIGURES}/when-are-you-ready-for-a-cro.jpg`,
          alt: "When are you ready for a CRO? Founder-led discovery, repeatable motion emerging, system building, then CRO territory.",
          width: 1448,
          height: 1086,
        },
        {
          type: "podcast",
          text: "MKB goes deeper into exactly when a founder should think about bringing in revenue leadership.",
          at: "18:00",
        },
      ],
    },
    {
      id: "move-up-in-sales",
      heading: "Founders shouldn't move away from sales. They should move up.",
      blocks: [
        { type: "paragraph", text: "As companies grow, founders understandably get tired of carrying sales themselves." },
        { type: "paragraph", text: "The natural reaction is:" },
        { type: "quote", text: "“Let's hire someone and finally get me out of sales.”" },
        { type: "paragraph", text: "MKB challenges that thinking." },
        { type: "paragraph", text: "He frames scaling around two things:" },
        { type: "paragraph", text: "**People and systems.**" },
        { type: "paragraph", text: "You need people you trust." },
        {
          type: "paragraph",
          text: "Then you need to take what lives inside the founder's head and turn it into something the organization can repeat:",
        },
        { type: "list", items: ["Calls", "Proposals", "Workflows", "Wins", "Customer learning", "Sales patterns"] },
        { type: "paragraph", text: "All of that needs to become part of the company's operating system." },
        { type: "paragraph", text: "Because simply working four times harder isn't how you go from $5M to $20M." },
        { type: "paragraph", text: "The founder's role therefore changes — but doesn't disappear." },
        { type: "paragraph", text: "They move **up** in sales." },
        {
          type: "paragraph",
          text: "From personally carrying every deal to making sure the company understands why deals happen in the first place.",
        },
        {
          type: "podcast",
          text: "This is one of the strongest sections of the conversation:",
          title: "Founders: Move Up in Sales, Don't Move Away.",
          at: "25:18",
        },
      ],
    },
    {
      id: "enduring-gtm-engine",
      heading: "More salespeople don't automatically create a GTM engine.",
      blocks: [
        { type: "paragraph", text: "There's another tempting assumption when revenue starts growing:" },
        { type: "paragraph", text: "If five salespeople generated this much revenue, perhaps ten salespeople will generate twice as much." },
        { type: "paragraph", text: "But MKB's experience in African markets pushed him toward a different way of thinking." },
        { type: "paragraph", text: "Build an **enduring GTM engine**." },
        {
          type: "paragraph",
          text: "In markets where capital and economics are tighter, every growth decision needs to withstand much stronger scrutiny.",
        },
        {
          type: "paragraph",
          text: "MKB describes his SeamlessHR experience with a memorable line: he went to Africa expecting to bring global learning to Africa, but came away with **Africa's learning for the globe**.",
        },
        { type: "paragraph", text: "The lesson?" },
        { type: "list", items: ["Growth with strong unit economics.", "Not growth at any cost."] },
        {
          type: "paragraph",
          text: "And as capital becomes more disciplined across markets, that lesson becomes increasingly relevant outside Africa too.",
        },
        {
          type: "podcast",
          text: "Hear the discussion around frontier markets, efficiency and building an enduring GTM engine:",
          at: "28:18",
        },
      ],
    },
    {
      id: "gtm-doesnt-need-a-template",
      heading: "Your GTM doesn't need another template.",
      blocks: [
        { type: "paragraph", text: "Common playbook tactics:" },
        { type: "list", items: ["Hire SDRs.", "Run Google Ads.", "Build outbound.", "Add another sales leader."] },
        { type: "paragraph", text: "It's easy to turn somebody else's growth story into a checklist." },
        {
          type: "paragraph",
          text: "But the final part of the conversation returns to the same idea MKB introduced when discussing fractional leadership:",
        },
        { type: "paragraph", text: "*Diagnose first.*" },
        {
          type: "paragraph",
          text: "If the underlying problem hasn't been solved, putting more people or money behind it only amplifies the problem.",
        },
        { type: "paragraph", text: "His framing is particularly useful:" },
        { type: "pullquote", text: "“If the problem isn't solved yet, hire a solver — not a multiplier.”" },
        { type: "paragraph", text: "Because zero multiplied by anything is still zero." },
        { type: "paragraph", text: "That applies beyond hiring:" },
        { type: "list", items: ["Channels", "Headcount", "Marketing", "Sales tooling", "Even AI"] },
        { type: "paragraph", text: "Before asking how to scale something, understand whether that something actually works." },
        {
          type: "figure",
          src: `${FIGURES}/solver-system-multiplier.jpg`,
          alt: "Solver → System → Multiplier: scale works only after the motion works. Don't multiply zero. Solve first, systemize second, scale third.",
          width: 1448,
          height: 1086,
        },
        {
          type: "paragraph",
          text: "MKB's final advice similarly emphasizes returning to fundamentals, staying grounded in the company's reality, focusing on the ICP and unit economics, and doubling down on what actually works.",
        },
      ],
    },
    {
      id: "the-takeaway",
      heading: "The Takeaway",
      blocks: [
        { type: "paragraph", text: "Hiring your first CRO isn't really about reaching a magic ARR number." },
        { type: "paragraph", text: "It's about what has changed inside the company:" },
        {
          type: "list",
          items: [
            "Have you learned who buys?",
            "Do you understand why they buy?",
            "Can you repeat the motion?",
            "Can someone other than the founder reproduce it?",
          ],
        },
        {
          type: "paragraph",
          text: "And are you now reaching the point where the bottleneck isn't discovery — but building the people and systems required to scale?",
        },
        { type: "paragraph", text: "That's when the CRO conversation becomes much more interesting." },
        { type: "paragraph", text: "Not as someone coming in with the perfect playbook." },
        {
          type: "paragraph",
          text: "But as someone capable of understanding the system you've built and helping turn it into one that can endure.",
        },
      ],
    },
    {
      id: "watch-the-full-conversation",
      heading: "Watch the full conversation",
      blocks: [
        {
          type: "watch",
          title: "When & How to Hire Your First CRO | MKB, former CRO at SeamlessHR | First Take Ep. 2",
          text: "Krish and MKB go deeper into fractional leadership, founder-led sales, the $3M–$10M transition, GTM systems, frontier-market unit economics and why copying somebody else's playbook can fail.",
        },
      ],
    },
  ],
};
