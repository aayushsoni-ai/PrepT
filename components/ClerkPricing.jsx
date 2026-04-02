// "use client";

// import { PricingTable } from "@clerk/nextjs";

// export default function ClerkPricing() {
//     return (
//         <div className="max-w-6xl mx-auto px-4">
//             <PricingTable
//                 appearance={{
//                     elements: {
//                         /* Layout */
//                         root: "grid grid-cols-1 md:grid-cols-3 gap-6",

//                         /* Card */
//                         card: `
//               group relative rounded-2xl p-8 flex flex-col
//               bg-[#0f0f11] border border-white/10
//               transition-all duration-300
//               hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]
//               hover:border-amber-400/20
//             `,

//                         /* Featured and Glow layer (fake premium effect) */
//                         card__featured: `
//               bg-[#141417] border border-amber-400/30
//               shadow-[0_0_40px_rgba(251,191,36,0.08)]
//               before:content-[''] before:absolute before:inset-0 before:rounded-2xl
//               before:bg-amber-400/5 before:blur-2xl before:opacity-0
//               group-hover:before:opacity-100 before:transition
//             `,

//             /* Badge */
//             badge: `
//             absolute -top-3 left-1/2 -translate-x-1/2
//             bg-amber-400 text-black text-xs font-bold
//             px-3 py-1 rounded-full
//             `,

//             /* Plan name */
//             headerTitle: `
//             text-xs tracking-widest uppercase
//             text-stone-500 mb-4
//             `,

//             /* Price */
//             price: `
//             text-5xl font-serif tracking-tight
//             bg-gradient-to-br from-amber-300 to-amber-500
//             bg-clip-text text-transparent
//             `,

//             priceSuffix: "text-sm text-stone-500 ml-1",

//             /* Credits / description */
//             description: "text-sm text-amber-400 mb-6",

//             /* Divider */
//             divider: "h-px bg-white/10 my-6",

//             /* Features */
//             features: "space-y-3 text-sm text-stone-400",

//             featureItem: "flex items-start gap-2",

//             /* Buttons */
//             button: `
//             w-full rounded-lg
//             bg-amber-400 text-black font-medium
//             hover:bg-amber-300 transition
//             `,

//             buttonSecondary: `
//             w-full rounded-lg border border-white/20
//             text-white hover:border-amber-400/40
//             `,
//           },
//         }}
//       />
//         </div>
//     );
// }