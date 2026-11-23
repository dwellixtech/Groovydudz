import type { ThemeDocument } from "../types/theme";

const cdn = (file: string) => `https://cdn.shopify.com/s/files/1/0742/4180/2318/files/${file}`;

// Mirrors the current groovydudz.com homepage so the editor starts from familiar ground.
// Collections are referenced by slug so the theme survives re-seeding.
export const defaultTheme: ThemeDocument = {
  version: 1,
  settings: {
    store_name: "GroovyDudz",
    logo_url: cdn("Untitled_design_1.png"),
    logo_height: 76,
    colors: {
      brand: "#b5336b",
      accent: "#e0793f",
      background: "#fbf8f4",
      text: "#2a1f24",
      footer_background: "#2f6f6c",
      footer_text: "#fdf6ec",
    },
    heading_font: "fraunces",
    announcement: {
      enabled: true,
      messages: "Free shipping on orders above ₹499\nNew party kits added every week",
      link: "/collections/birthday-collections",
      background: "#b5336b",
      text_color: "#ffffff",
    },
    navigation: [
      { label: "Birthday", href: "/collections/birthday-collections" },
      { label: "Theme Decorations", href: "/collections/theme-decorations" },
      { label: "Baby Shower", href: "/collections/baby-showers-decoration" },
      { label: "Welcome Baby", href: "/collections/welcome-baby" },
      { label: "Festive", href: "/collections/festive-decoration" },
      { label: "Party Accessories", href: "/collections/party-accessories" },
      { label: "Toys & Craft", href: "/collections/toys-craft" },
      { label: "Shop all", href: "/collections/all" },
    ],
    footer: {
      about: "Birthday, baby shower and theme party decorations, curated by people who love celebrations.",
      show_newsletter: true,
      show_contact: true,
      contact_heading: "Get in touch",
      contact_email: "support@groovydudz.com",
      show_email: true,
      show_whatsapp: true,
      show_socials: true,
      columns: [
        {
          title: "Shop",
          links: "Birthday Decorations | /collections/birthday-collections\nTheme Parties | /collections/theme-decorations\nBaby Shower | /collections/baby-showers-decoration\nWelcome Baby | /collections/welcome-baby\nParty Accessories | /collections/party-accessories\nShop all | /collections/all",
        },
        {
          title: "Customer care",
          links: "Contact Us | /pages/contact\nFAQs | /pages/faqs\nTrack Your Order | /pages/track-order",
        },
        {
          title: "Business",
          links: "Bulk Orders | /pages/bulk-orders\nCorporate Orders | /pages/corporate-orders\nEvent Planners | /pages/event-planners\nBecome a Dealer | /pages/dealer",
        },
        {
          title: "Policies",
          links: "Shipping Policy | /pages/shipping-policy\nReturn & Refund Policy | /pages/refund-policy\nPrivacy Policy | /pages/privacy-policy\nTerms & Conditions | /pages/terms\nCancellation Policy | /pages/cancellation-policy",
        },
      ],
      instagram: "",
      facebook: "",
      youtube: "",
      whatsapp: "",
      copyright: "© GroovyDudz. All rights reserved.",
    },
  },
  sections: [
    {
      id: "hero",
      type: "hero_slideshow",
      settings: {
        height: "adapt",
        autoplay: true,
        interval: 5,
        slides: [
          { image: cdn("ChatGPT_Image_Jul_21_2026_12_59_07_PM.png"), mobile_image: "", heading: "", subheading: "", button_label: "", link: "/collections/theme-decorations", text_position: "left", overlay: false },
          { image: cdn("ChatGPT_Image_Jun_25_2026_12_10_13_PM_a5d6cef4-41e1-43e6-a3ea-2eead719f2d5.png"), mobile_image: "", heading: "", subheading: "", button_label: "", link: "/collections/birthday-collections", text_position: "left", overlay: false },
          { image: cdn("ChatGPT_Image_Jun_25_2026_12_39_55_PM_030f1e9c-d104-4ac1-aae6-363a8ee8b096.png"), mobile_image: "", heading: "", subheading: "", button_label: "", link: "/collections/forest-theme", text_position: "left", overlay: false },
          { image: cdn("ChatGPT_Image_Jul_21_2026_01_00_40_PM_48e2e1de-5e7b-4d5a-ab90-bf81ce68f03a.png"), mobile_image: "", heading: "", subheading: "", button_label: "", link: "/collections/baby-showers-decoration", text_position: "left", overlay: false },
        ],
      },
    },
    {
      id: "features",
      type: "feature_row",
      settings: {
        heading: "",
        background: "",
        items: [
          { icon: "sparkles", title: "Kids' favourite themes", text: "Designed around a story" },
          { icon: "heart", title: "Made with love", text: "A little magic in every order" },
          { icon: "users", title: "Party people", text: "Curated by people who love birthdays" },
          { icon: "truck", title: "Free shipping", text: "On orders above ₹499, across India" },
        ],
      },
    },
    {
      id: "ribbon",
      type: "marquee",
      settings: { messages: "Free shipping on orders above ₹499\nNew arrivals weekly\nComplete party kits from ₹249\nSecure payments with PayU", background: "#e0793f", text_color: "#ffffff", speed: "normal", wavy: true },
    },
    {
      id: "shop-by-collection",
      type: "collection_list",
      settings: {
        heading: "Shop by collection",
        subheading: "Everything you need for the big day, in one box",
        collections: ["festive-decoration", "forest-theme", "birthday-collections", "baby-showers-decoration"],
        columns: "4",
        shape: "portrait",
        background: "#4f9f9b",
        text_color: "#ffffff",
      },
    },
    { id: "divider-1", type: "divider", settings: { style: "bunting", image: "", size: "small", background: "" } },
    {
      id: "festive",
      type: "product_carousel",
      settings: { heading: "Festive decoration", subheading: "", collection: "festive-decoration", limit: 10, layout: "carousel", show_view_all: true, background: "" },
    },
    {
      id: "birthday",
      type: "product_carousel",
      settings: { heading: "Birthday collections", subheading: "Complete combo kits for every age", collection: "birthday-collections", limit: 10, layout: "carousel", show_view_all: true, background: "" },
    },
    {
      id: "kids-themes",
      type: "product_carousel",
      settings: { heading: "Kids' favourite themes", subheading: "Jungle, space, unicorn, princess and more", collection: "theme-decorations", limit: 10, layout: "carousel", show_view_all: true, background: "#eef7f6" },
    },
    {
      id: "how-it-works",
      type: "feature_row",
      settings: {
        heading: "Party-ready in three steps",
        background: "",
        items: [
          { icon: "gift", title: "1. Pick a kit", text: "Choose a theme combo with everything in one box" },
          { icon: "truck", title: "2. We deliver", text: "Packed with care and shipped across India" },
          { icon: "party", title: "3. Set it up", text: "Easy DIY setup at home, with arch tape and glue dots included in most kits" },
        ],
      },
    },
    {
      id: "pump-banner",
      type: "image_banner",
      settings: { image: cdn("ChatGPT_Image_Jul_31_2026_01_28_21_PM.png"), mobile_image: "", heading: "", text: "", button_label: "", link: "/collections/party-accessories", height: "adapt", rounded: true },
    },
    {
      id: "welcome-baby",
      type: "product_carousel",
      settings: { heading: "Welcome baby decoration", subheading: "", collection: "welcome-baby", limit: 8, layout: "carousel", show_view_all: true, background: "#fdeef3" },
    },
    { id: "divider-2", type: "divider", settings: { style: "bunting_pastel", image: "", size: "small", background: "" } },
    {
      id: "accessories",
      type: "product_carousel",
      settings: { heading: "Party accessories", subheading: "Pumps, glue dots, ribbons and more", collection: "party-accessories", limit: 10, layout: "carousel", show_view_all: true, background: "" },
    },
    {
      id: "signature",
      type: "image_with_text",
      settings: {
        image: "https://cdn.shopify.com/s/files/1/0742/4180/2318/files/51ZSxXv24gL._SY300_SX300_QL70_FMwebp_4b1201dd-e503-4c97-b4af-09cd952ef769.webp",
        eyebrow: "Bestseller",
        heading: "Our signature collection",
        text: "Loved by parents and trusted by thousands, our theme sets turn any birthday into an unforgettable celebration.",
        button_label: "Shop birthday kits",
        link: "/collections/birthday-collections",
        image_position: "left",
        background: "#fff4dc",
      },
    },
    {
      id: "newsletter",
      type: "newsletter",
      settings: { heading: "Join the party list", text: "New themes, festive drops and offers, straight to your inbox. No spam, just confetti.", button_label: "Subscribe", background: "" },
    },
  ],
};
