import type { EpisodeArticle } from "../episodes";

/* Episode notes for FIRST TAKE Ep. 3, from the supplied Medium article
   "Search Has Changed. How Should B2B SaaS Win in the AI Era?".
   The article's fourth "From the podcast" link (39:46) is left out: it points past the
   end of the 37:07 episode. */

const FIGURES = "/stories/kick-your-competition-out-with-aeo";

export const kickYourCompetitionOutWithAeo: EpisodeArticle = {
  dek: "Vibin Baburajan on SEO, AEO, demand generation, brand mentions, and creating content that still stands out when everyone has AI.",
  sections: [
    {
      id: "introduction",
      navLabel: "Introduction",
      blocks: [
        { type: "paragraph", text: "For years, B2B marketing had a fairly familiar playbook." },
        {
          type: "list",
          items: [
            "Find what people are searching for.",
            "Create content around those searches.",
            "Rank on Google.",
            "Bring people to your website.",
            "Then convince them to buy.",
          ],
        },
        { type: "paragraph", text: "AI hasn't killed that entire system." },
        { type: "paragraph", text: "But it has changed where a large part of the decision now happens." },
        {
          type: "paragraph",
          text: "Buyers can ask an AI tool a detailed question, compare categories, evaluate products, understand alternatives, and form an opinion about your brand before they ever land on your website.",
        },
        { type: "paragraph", text: "That changes what marketers need to optimize for." },
        {
          type: "paragraph",
          text: "In Episode 3 of First Take by JazzHQ, Krish sits down with Vibin Baburajan, Co-Founder of Epic Slope Partners, to unpack what SEO, AEO, content and demand generation look like in this new environment.",
        },
        { type: "paragraph", text: "And one idea runs through almost the entire conversation:" },
        { type: "pullquote", text: "AI made creating things easier. It did not make earning attention easier." },
      ],
    },
    {
      id: "input-easier-output-harder",
      heading: "AI made the input easier. The output became harder.",
      blocks: [
        { type: "paragraph", text: "Creating a blog used to require writers." },
        { type: "paragraph", text: "Creating an ad needed designers." },
        { type: "paragraph", text: "Running campaigns required specialist knowledge." },
        { type: "paragraph", text: "Today, AI can dramatically reduce the effort required to get started." },
        { type: "paragraph", text: "That sounds like an advantage." },
        { type: "paragraph", text: "But Vibin points out the second-order effect:" },
        { type: "paragraph", text: "**Everyone else got the same advantage.**" },
        {
          type: "paragraph",
          text: "You are no longer competing only with the small set of companies that deeply understand a channel. You're competing with almost everyone capable of opening an AI tool and generating content.",
        },
        { type: "paragraph", text: "So the differentiator isn't simply:" },
        { type: "quote", text: "“Can we produce more?”" },
        { type: "paragraph", text: "It becomes:" },
        { type: "quote", text: "“Can what we're producing survive over time?”" },
        {
          type: "paragraph",
          text: "Vibin points to companies losing significant organic traffic after algorithm updates as an example of what happens when teams optimize for short-term volume instead of understanding the channel deeply.",
        },
        {
          type: "paragraph",
          text: "His argument is that good marketing needs to compound across years, not just create a spike over a few months.",
        },
        {
          type: "podcast",
          text: "AI happened — and the old content equation changed.",
          at: "16:02",
        },
      ],
    },
    {
      id: "understand-the-job-of-the-channel",
      heading: "Before choosing SEO, LinkedIn or paid, understand what job the channel needs to do.",
      navLabel: "Understand the job of the channel",
      blocks: [
        { type: "paragraph", text: "One of the easiest mistakes for an early-stage company is starting with a list of channels." },
        { type: "quote", text: "“We should do SEO.”" },
        { type: "quote", text: "“We need LinkedIn.”" },
        { type: "quote", text: "“Let's run Google Ads.”" },
        { type: "quote", text: "“We should build in public.”" },
        { type: "paragraph", text: "But those aren't strategies." },
        { type: "paragraph", text: "They're distribution mechanisms." },
        { type: "paragraph", text: "Vibin suggests starting further upstream." },
        {
          type: "paragraph",
          text: "If you're creating a new category and nobody is searching for what you do yet, SEO can't magically capture demand that doesn't exist.",
        },
        { type: "paragraph", text: "You first need to generate it." },
        {
          type: "paragraph",
          text: "If you're entering an established category where buyers already know the problem and actively search for solutions, the equation changes.",
        },
        { type: "paragraph", text: "Now there is existing demand to capture." },
        { type: "paragraph", text: "And even then, the answer isn't automatically LinkedIn or SEO." },
        { type: "paragraph", text: "If your ICP spends its time somewhere else, go there." },
        { type: "paragraph", text: "The lesson is simple:" },
        {
          type: "pullquote",
          text: "Choose the channel around buyer behaviour. Don't ask buyers to change their behaviour around your channel.",
        },
        {
          type: "paragraph",
          text: "Vibin's recommendation is to understand the category first: new categories may require demand generation, while existing categories can make demand-fulfillment channels much more useful. Founder branding and founder-led sales also help reveal what buyers actually care about before the company scales distribution.",
        },
        {
          type: "figure",
          src: `${FIGURES}/start-with-the-demand.webp`,
          alt: "Don't Start With a Channel. Start With the Demand. New category: demand doesn't exist yet, so demand generation (founder content, LinkedIn, outbound, community, Meta / social). Existing category: people are already looking, so demand fulfillment (SEO, AEO, Google Search, comparison content). Be where your customer already is.",
          width: 1400,
          height: 1050,
        },
      ],
    },
    {
      id: "ai-evaluates-you-first",
      heading: "Google used to send buyers to your website. AI can evaluate you before they arrive.",
      navLabel: "AI can evaluate you first",
      blocks: [
        { type: "paragraph", text: "This is one of the biggest changes in search." },
        { type: "paragraph", text: "The old journey looked something like:" },
        { type: "callout", text: "Question → Google → Links → Website → Evaluation" },
        { type: "paragraph", text: "The company owned an important part of that evaluation." },
        { type: "paragraph", text: "Someone landed on your website." },
        {
          type: "list",
          items: ["You controlled the headline.", "You controlled the case studies.", "You controlled the positioning.", "You controlled the story."],
        },
        { type: "paragraph", text: "AI changes that sequence." },
        { type: "paragraph", text: "Buyers can now learn about a brand inside an LLM before visiting the company's website." },
        {
          type: "paragraph",
          text: "Instead of opening ten different websites, someone may use AI to understand the category, compare options and narrow the field before visiting only two or three companies.",
        },
        { type: "paragraph", text: "The journey starts looking more like:" },
        { type: "callout", text: "Question → AI → Evaluation → Shortlist → Website" },
        { type: "paragraph", text: "Your website hasn't disappeared." },
        { type: "paragraph", text: "But it may no longer be where the buyer forms their first meaningful opinion of you." },
        { type: "paragraph", text: "That's why AEO matters." },
      ],
    },
    {
      id: "search-volume-becoming-intent",
      heading: "Search volume is becoming intent.",
      blocks: [
        { type: "paragraph", text: "Traditional SEO gave marketers a convenient unit:" },
        { type: "paragraph", text: "**Keyword volume.**" },
        {
          type: "paragraph",
          text: "If thousands of people searched for a phrase every month, you could estimate demand, prioritize content and build around recognizable query patterns.",
        },
        { type: "paragraph", text: "AI conversations are messier." },
        { type: "paragraph", text: "A buyer might ask:" },
        { type: "quote", text: "“I'm a founder of a 10-person startup looking for a tool that solves X under these constraints.”" },
        { type: "paragraph", text: "Someone else can express almost exactly the same intent using completely different language." },
        {
          type: "paragraph",
          text: "Vibin's framing is that optimization therefore moves away from matching a neat keyword pattern and toward covering buyer intent.",
        },
        { type: "paragraph", text: "The funnel changes too." },
        { type: "paragraph", text: "Traditional SEO often separated discovery into:" },
        { type: "callout", text: "TOFU → MOFU → BOFU" },
        {
          type: "paragraph",
          text: "A buyer might make several searches while moving from understanding the problem to comparing solutions.",
        },
        { type: "paragraph", text: "With AI, many of those questions can happen inside a single conversation." },
        { type: "paragraph", text: "That's an important mental shift." },
        { type: "paragraph", text: "The question isn't only:" },
        { type: "quote", text: "“What keyword should we rank for?”" },
        { type: "paragraph", text: "It's increasingly:" },
        {
          type: "pullquote",
          text: "“When a buyer describes this problem in their own words, does the internet give AI enough evidence to understand and recommend us?”",
        },
      ],
    },
    {
      id: "brand-in-ai-search",
      heading: "How does your brand show up in AI search?",
      navLabel: "How your brand shows up in AI search",
      blocks: [
        { type: "paragraph", text: "Vibin breaks the journey into four stages." },
        {
          type: "paragraph",
          text: "**01 Findable — Can AI access you?** Your site needs to be accessible to LLM crawlers, technically sound and structured so important information can actually be discovered.",
        },
        {
          type: "paragraph",
          text: "**02 Relevant — Do you answer the right intent?** Your positioning, content, metadata and pages need to reflect what buyers are trying to understand.",
        },
        {
          type: "paragraph",
          text: "**03 Cited — Does AI use you as evidence?** Your content needs to be useful enough that an AI system can reference it as a source.",
        },
        {
          type: "paragraph",
          text: "**04 Mentioned — Does AI recommend you?** This is where your brand appears directly in an answer when someone asks for products or companies in your category.",
        },
        {
          type: "paragraph",
          text: "Vibin describes Findability → Relevance → Citation → Brand Mentions as the progression brands should think about when approaching AEO.",
        },
        {
          type: "figure",
          src: `${FIGURES}/brand-in-ai-search.webp`,
          alt: "How Does Your Brand Show Up in AI Search? From being accessible to being recommended. 01 Findable: can AI access you? 02 Relevant: do you answer the right intent? 03 Cited: does AI use you as evidence? 04 Mentioned: does AI recommend you? The holy grail isn't only being linked. It's being mentioned.",
          width: 1400,
          height: 1050,
        },
        {
          type: "podcast",
          text: "The four things a brand needs to start appearing in AI answers.",
          at: "28:05",
        },
      ],
    },
    {
      id: "website-claims-arent-enough",
      heading: "Your website saying you're great isn't enough anymore.",
      navLabel: "Your website isn't enough anymore",
      blocks: [
        { type: "paragraph", text: "This is where AEO becomes more interesting than simply “SEO for ChatGPT.”" },
        { type: "paragraph", text: "Imagine your website says:" },
        { type: "quote", text: "“The simplest and most intuitive product in the category.”" },
        { type: "paragraph", text: "But customers repeatedly write reviews saying:" },
        { type: "quote", text: "“Powerful product, but difficult to learn.”" },
        { type: "paragraph", text: "Which version should an AI system believe?" },
        {
          type: "paragraph",
          text: "Increasingly, companies need consistency between what they say about themselves and what the wider market says about them.",
        },
        { type: "paragraph", text: "Third-party signals matter." },
        { type: "list", items: ["Reddit discussions.", "G2 and Capterra reviews.", "YouTube comments.", "Forums.", "Podcasts.", "Other people talking about the brand."] },
        {
          type: "paragraph",
          text: "As AI makes first-party content easier to produce, independent validation becomes more valuable. Vibin specifically points to third-party reviews, Reddit, YouTube comments and forums as signals AI systems can draw from.",
        },
        { type: "paragraph", text: "And that means AEO can't simply be owned by someone publishing articles." },
        { type: "paragraph", text: "It touches:" },
        { type: "list", items: ["Product.", "Customer experience.", "Positioning.", "Brand.", "Community.", "Reviews.", "Content.", "Reputation."] },
        { type: "paragraph", text: "Your marketing claim and your customer's lived experience increasingly need to agree." },
        { type: "paragraph", text: "You can't manufacture reputation after the fact." },
        {
          type: "paragraph",
          text: "This is why “engineering conversations” doesn't mean jumping into Reddit and planting brand mentions everywhere.",
        },
        { type: "paragraph", text: "The order matters." },
        { type: "paragraph", text: "First, fix the underlying truth." },
        {
          type: "paragraph",
          text: "If your positioning says one thing but customers consistently experience another, adding more mentions doesn't solve that disconnect.",
        },
        { type: "paragraph", text: "The product needs to earn the story first." },
        { type: "paragraph", text: "Then marketing helps that story travel." },
        { type: "paragraph", text: "This also changes how we should think about brand." },
        { type: "paragraph", text: "Brand isn't simply the logo, website and campaign." },
        { type: "paragraph", text: "In AI discovery:" },
        {
          type: "pullquote",
          text: "Brand becomes the collection of signals the internet has accumulated about you.",
        },
        {
          type: "paragraph",
          text: "Vibin describes traditional SEO in terms of content velocity, link velocity and optimization velocity. AEO adds another layer: third-party content, brand mentions and brand reputation.",
        },
        { type: "paragraph", text: "That makes brand less cosmetic." },
        { type: "paragraph", text: "It becomes part of the discovery infrastructure." },
      ],
    },
    {
      id: "ai-should-help-you-write",
      heading: "AI should help you write. It shouldn't become the reason your content exists.",
      navLabel: "AI should help you write",
      blocks: [
        { type: "paragraph", text: "Then comes the obvious question." },
        {
          type: "paragraph",
          text: "If AI has made creating content this easy, should founders and marketing teams simply use it to produce everything?",
        },
        { type: "paragraph", text: "Vibin makes an important distinction." },
        { type: "paragraph", text: "For personal content, AI can be a useful editing layer." },
        { type: "paragraph", text: "Your thinking starts with you." },
        { type: "paragraph", text: "You dictate the thought. Use AI to structure it. Clean it up. Make it easier to read." },
        { type: "paragraph", text: "The original insight is still yours." },
        { type: "paragraph", text: "Company content is different." },
        {
          type: "paragraph",
          text: "If your SEO article is created entirely from the same models everyone else uses, what exactly makes it worth discovering?",
        },
        { type: "paragraph", text: "His answer is one of the strongest ideas in the episode:" },
        { type: "pullquote", text: "Content writers need to think more like journalists." },
        { type: "paragraph", text: "Use AI to create the skeleton." },
        { type: "paragraph", text: "Then go find material AI doesn't already have." },
        {
          type: "list",
          items: ["Talk to experts.", "Interview customers.", "Use proprietary data.", "Pull insights from your product."],
        },
        { type: "paragraph", text: "Find what Vibin calls your “earned secrets.”" },
        {
          type: "paragraph",
          text: "The transcript describes using AI for the base structure, then enriching the work through expert conversations, proprietary data and insights unique to the company.",
        },
        {
          type: "figure",
          src: `${FIGURES}/ai-skeleton-human-story.webp`,
          alt: "AI Can Build the Skeleton. You Still Need the Story. What makes content worth discovering in the AI era? AI: what it can do. Journalism: what humans must add. Earned secrets: what only you know. Content worth discovering: what the audience gets. Don't ask AI to make you different using the same information everyone else has.",
          width: 1400,
          height: 1050,
        },
        {
          type: "podcast",
          text: "How founders should actually use AI for content creation.",
          at: "33:53",
        },
      ],
    },
    {
      id: "seo-like-investing",
      heading: "Great SEO thinks more like investing than growth hacking.",
      navLabel: "SEO is more like investing",
      blocks: [
        { type: "paragraph", text: "There's a reason short-term SEO can be seductive." },
        { type: "paragraph", text: "It can work." },
        { type: "paragraph", text: "At least initially." },
        { type: "paragraph", text: "Publish aggressively. Target easy opportunities. Watch traffic rise." },
        { type: "paragraph", text: "The dashboard looks good." },
        { type: "paragraph", text: "And then an algorithm change exposes what was underneath." },
        { type: "paragraph", text: "Vibin compares good SEO thinking to investing." },
        {
          type: "paragraph",
          text: "The goal isn't necessarily a sudden 100% jump this year. It's building something capable of compounding for several years.",
        },
        { type: "paragraph", text: "His distinction is useful:" },
        { type: "paragraph", text: "Mediocre SEO can sometimes look better in the short term." },
        { type: "pullquote", text: "Good SEO becomes clearer with time." },
        {
          type: "paragraph",
          text: "In the conversation, Vibin argues that strong SEO prioritizes continuous compounding rather than optimizing purely for immediate spikes.",
        },
        { type: "paragraph", text: "The same principle applies more broadly to B2B marketing." },
        { type: "paragraph", text: "Not every business should optimize for virality." },
        { type: "paragraph", text: "Not every business should patiently wait for SEO either." },
        {
          type: "paragraph",
          text: "A fast-moving prosumer or viral AI product may need aggressive UGC, influencer distribution and paid amplification.",
        },
        {
          type: "paragraph",
          text: "A more traditional B2B SaaS company may get more value from channels that compound steadily over time.",
        },
        { type: "paragraph", text: "The channel still depends on the product." },
        { type: "paragraph", text: "Which brings the conversation almost exactly back to where it began." },
      ],
    },
    {
      id: "the-takeaway",
      heading: "The Takeaway",
      blocks: [
        { type: "paragraph", text: "AI hasn't removed the need for marketing fundamentals." },
        { type: "paragraph", text: "It has made weak execution easier to produce." },
        { type: "paragraph", text: "And good execution harder to differentiate." },
        { type: "paragraph", text: "For B2B founders, the questions now become:" },
        {
          type: "list",
          items: [
            "Where does demand already exist?",
            "Where does our customer actually spend attention?",
            "Can AI systems find and understand our company?",
            "Does our content match real buyer intent?",
            "Do independent sources support the story we're telling?",
            "Are we creating something original — or simply generating more of what already exists?",
          ],
        },
        { type: "paragraph", text: "And maybe the biggest one:" },
        {
          type: "pullquote",
          text: "Are we building a marketing engine that still works after the tactic stops being fashionable?",
        },
        { type: "paragraph", text: "Search is changing." },
        { type: "paragraph", text: "Content is changing." },
        { type: "paragraph", text: "The interfaces buyers use are changing." },
        {
          type: "paragraph",
          text: "But the advantage still comes from understanding the customer better, producing something worth discovering, earning trust, and investing long enough for those advantages to compound.",
        },
      ],
    },
    {
      id: "watch-the-full-conversation",
      heading: "Watch the full conversation",
      blocks: [
        {
          type: "watch",
          title: "First Take Ep. 3 Vibin Baburajan on B2B SaaS Marketing, SEO, AEO & AI Content",
          text: "Krish and Vibin go deeper into demand generation vs. demand fulfillment, building SEO at scale, AI search, brand mentions, UGC, founder content and why sustainable marketing needs to compound over time.",
        },
      ],
    },
  ],
};
