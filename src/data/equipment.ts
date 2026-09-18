export interface EquipmentItem {
  name: string;
  src: string;
  external?: boolean;
  label: { zh: string; en: string };
}
// Illustrative devices, not the author's actual equipment inventory.
export const equipmentItems: EquipmentItem[] = [
  { name: 'Laptop', src: '/svg/equip/apple.svg', label: { zh: '示例笔记本', en: 'Example laptop' } },
  { name: 'Display', src: '/svg/equip/device-desktop.svg', external: true, label: { zh: '示例显示器', en: 'Example display' } },
  { name: 'Server', src: '/svg/equip/server.svg', external: true, label: { zh: '示例服务器', en: 'Example server' } },
  { name: 'Reader', src: '/svg/equip/book.svg', external: true, label: { zh: '示例阅读器', en: 'Example reader' } },
];
