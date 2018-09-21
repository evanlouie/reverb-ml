export const stringToRGBA = (str: string): string => {
  const cached = _cache[str] || (_cache[str] = randomColour(hexToRGB(stringToHexColour(str))));

  return cached;
};

const _cache: { [key: string]: any } = {};

/**
 * Convert any random string to a distinct 6 digit hex color string
 * @returns {string} of format `#000000`
 */
const stringToHexColour = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // tslint:disable-next-line:no-bitwise
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    // tslint:disable-next-line:no-bitwise
    const value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
};

/**
 * Convert hex colour string to an RGB map
 */
const hexToRGB = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      red: parseInt(result[1], 16),
      green: parseInt(result[2], 16),
      blue: parseInt(result[3], 16),
    };
  }
  throw new Error("Invalid Hex color string provided");
};

/**
 * Generate an HTML usable rgba()
 */
const randomColour = ({
  red = Math.floor(Math.random() * 256),
  green = Math.floor(Math.random() * 256),
  blue = Math.floor(Math.random() * 256),
  alpha = 0.5,
}) => `rgba(${red},${green},${blue}, ${alpha})`;
