/**
 * Icon registry — Tabler Icons (MIT) + custom icons drawn to Tabler's 24px grid (handoff §6).
 */
import tools from '@tabler/icons/outline/tools.svg?raw';
import terminal2 from '@tabler/icons/outline/terminal-2.svg?raw';
import plugConnected from '@tabler/icons/outline/plug-connected.svg?raw';
import databaseExport from '@tabler/icons/outline/database-export.svg?raw';
import gauge from '@tabler/icons/outline/gauge.svg?raw';
import lifebuoy from '@tabler/icons/outline/lifebuoy.svg?raw';
import cloudCode from '@tabler/icons/outline/cloud-code.svg?raw';
import zoomQuestion from '@tabler/icons/outline/zoom-question.svg?raw';
import rocket from '@tabler/icons/outline/rocket.svg?raw';
import phoneCall from '@tabler/icons/outline/phone-call.svg?raw';
import arrowDown from '@tabler/icons/outline/arrow-down.svg?raw';
import browserCheck from '@tabler/icons/outline/browser-check.svg?raw';
import code from '@tabler/icons/outline/code.svg?raw';
import tool from '@tabler/icons/outline/tool.svg?raw';
import transferIn from '@tabler/icons/outline/transfer-in.svg?raw';
import world from '@tabler/icons/outline/world.svg?raw';
import signRight from '@tabler/icons/outline/sign-right.svg?raw';
import x from '@tabler/icons/outline/x.svg?raw';

/** Strip the outer <svg> and Tabler's invisible bounding-box path. */
const inner = (svg: string) =>
    svg
        .replace(/^[\s\S]*?<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '')
        .trim();

export const tabler = {
    tools, 'terminal-2': terminal2, 'plug-connected': plugConnected, 'database-export': databaseExport,
    gauge, lifebuoy, 'cloud-code': cloudCode, 'zoom-question': zoomQuestion, rocket,
    'phone-call': phoneCall, 'arrow-down': arrowDown, 'browser-check': browserCheck,
    code, tool, 'transfer-in': transferIn, world, 'sign-right': signRight, x,
} as const;

export const custom = {
    school:
        '<path d="M22 9L12 5L2 9L12 13L22 9L22 15"/><path d="M6 10.6L6 16C6 17.66 8.69 19 12 19C15.31 19 18 17.66 18 16L18 10.6"/>',
    heart:
        '<path d="M19.5 12.57L12 20L4.5 12.57C2.6 10.6 2.7 7.5 4.7 5.7C6.8 3.9 10 4.2 12 6C14 4.2 17.2 3.9 19.3 5.7C21.3 7.5 21.4 10.6 19.5 12.57Z"/>',
    'mood-excited':
        '<circle cx="12" cy="12" r="9"/><path d="M8 10.5C8.5 9.3 9.5 9.3 10 10.5"/><path d="M14 10.5C14.5 9.3 15.5 9.3 16 10.5"/><path d="M8.5 13.5L15.5 13.5C15.5 15.6 13.9 17 12 17C10.1 17 8.5 15.6 8.5 13.5Z"/>',
    bolt: '<path d="M13 3L13 10L19 10L11 21L11 14L5 14L13 3Z"/>',
    'shield-check':
        '<path d="M12 3C14.4 5.1 17.4 6.1 20.5 6C21.6 12.6 17.9 19 12 21C6.1 19 2.4 12.6 3.5 6C6.6 6.1 9.6 5.1 12 3Z"/><path d="M9 12L11 14L15 10"/>',
    'quote-open':
        '<path d="M10 11L6 11C5.45 11 5 10.55 5 10L5 7C5 6.45 5.45 6 6 6L9 6C9.55 6 10 6.45 10 7L10 13C10 15.67 8.67 17.33 6 18"/><path d="M19 11L15 11C14.45 11 14 10.55 14 10L14 7C14 6.45 14.45 6 15 6L18 6C18.55 6 19 6.45 19 7L19 13C19 15.67 17.67 17.33 15 18"/>',
    'menu-2': '<path d="M4 6L20 6M4 12L20 12M4 18L20 18"/>',
    'chevron-down': '<path d="M6 9L12 15L18 9"/>',
} as const;

export type IconName = keyof typeof tabler | keyof typeof custom;
export const iconNames = [...Object.keys(tabler), ...Object.keys(custom)] as IconName[];

export function iconBody(name: IconName): string {
    return name in custom ? custom[name as keyof typeof custom] : inner(tabler[name as keyof typeof tabler]);
}
