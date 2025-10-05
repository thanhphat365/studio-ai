// utils/color.ts

/**
 * Converts a HEX color string (e.g., "#RRGGBB") to an RGB string "R G B".
 * Returns null if the hex code is invalid.
 */
export const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : null;
};

/**
 * Converts an "R G B" string to a HEX color string.
 */
export const rgbStringToHex = (rgbString: string): string => {
    const rgb = rgbString.split(' ').map(Number);
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
};


/**
 * Determines if a color is light or dark and returns a contrasting text color (black or white).
 * @param hex The hex color string (e.g., "#RRGGBB").
 * @returns The hex code for a contrasting text color ('#0f172a' for dark or '#f8fafc' for light).
 */
export const getContrastingTextColor = (hex: string): string => {
    if (!hex || hex.length < 4) return '#0f172a'; // Default to dark text
    
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '#0f172a';

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    // Using the WCAG luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#0f172a' : '#f8fafc'; // slate-900 (dark) or slate-50 (light)
};