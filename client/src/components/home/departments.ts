import {
  Armchair,
  Bike,
  Car,
  CookingPot,
  Droplets,
  Dumbbell,
  Footprints,
  Gem,
  Glasses,
  Headphones,
  Lamp,
  Laptop,
  Package,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  SprayCan,
  Tablet,
  Watch,
  type LucideIcon,
} from "lucide-react";

// Presentation only (icon + tint) for each department slug in the catalog.
// Names and counts come from the API; an unknown slug falls back to a box.
const ICONS: Record<string, LucideIcon> = {
  groceries: ShoppingBasket,
  "kitchen-accessories": CookingPot,
  smartphones: Smartphone,
  "sports-accessories": Dumbbell,
  "mobile-accessories": Headphones,
  laptops: Laptop,
  tablets: Tablet,
  fragrances: SprayCan,
  beauty: Sparkles,
  "skin-care": Droplets,
  furniture: Armchair,
  "home-decoration": Lamp,
  "mens-watches": Watch,
  "womens-watches": Watch,
  "mens-shoes": Footprints,
  "womens-shoes": Footprints,
  sunglasses: Glasses,
  "mens-shirts": Shirt,
  tops: Shirt,
  "womens-dresses": Shirt,
  "womens-bags": ShoppingBag,
  "womens-jewellery": Gem,
  motorcycle: Bike,
  vehicle: Car,
};

const TINTS = ["bg-tint-mint", "bg-tint-sky", "bg-tint-peach", "bg-tint-lilac", "bg-tint-butter", "bg-tint-sage", "bg-tint-rose", "bg-tint-sand"];

export function departmentIcon(slug: string): LucideIcon {
  return ICONS[slug] ?? Package;
}

/** Tints cycle by position, so neighbouring tiles never share a colour. */
export function departmentTint(index: number) {
  return TINTS[index % TINTS.length];
}
