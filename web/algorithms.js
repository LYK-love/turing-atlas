// Each example compiles to ordinary [state, read, next, write, move] rows.
// B is blank. H writes the final result and stops.
const bits = ['0', '1'];

export function substringRules(pattern) {
  if (!/^[01]{1,12}$/.test(pattern)) {
    throw Error('查找模式须由 1–12 个二进制位组成。');
  }

  // State k+1 records the longest suffix matching a length-k pattern prefix.
  // The last state means a match has already been found.
  const found = pattern.length + 1;
  const rules = [];
  for (let k = 0; k < pattern.length; k++) {
    for (const bit of bits) {
      const suffix = pattern.slice(0, k) + bit;
      let length = Math.min(pattern.length, suffix.length);
      while (!suffix.endsWith(pattern.slice(0, length))) length--;
      rules.push([k + 1, bit, length + 1, 'B', 'R']);
    }
    rules.push([k + 1, 'B', k + 1, '0', 'H']);
  }
  return [
    ...rules,
    ...bits.map(bit => [found, bit, found, 'B', 'R']),
    [found, 'B', found, '1', 'H'],
  ];
}

export const MORE_EXAMPLES = {
  parity: {
    name: '奇偶校验',
    input: '10110',
    description: '从左到右统计 1 的奇偶性。奇数写 1，偶数写 0。空串输出 0。',
    rules: [
      [1, '0', 1, 'B', 'R'], [1, '1', 2, 'B', 'R'], [1, 'B', 1, '0', 'H'],
      [2, '0', 2, 'B', 'R'], [2, '1', 1, 'B', 'R'], [2, 'B', 2, '1', 'H'],
    ],
  },
  substring: {
    name: '查找子串',
    input: '1101010',
    pattern: '101',
    description: '逐位匹配指定子串，复用已经匹配的前缀。找到写 1，否则写 0。',
    rules: substringRules('101'),
  },
  palindrome: {
    name: '回文判定',
    input: '10101',
    description: '反复比较并擦除首尾两位。回文写 1，否则写 0。空串也是回文。',
    rules: [
      // Read and erase the leftmost bit, retaining it in the control state.
      [1, 'B', 1, '1', 'H'],
      ...bits.flatMap((bit, index) => {
        const scan = index + 2;
        const compare = index + 4;
        const other = bits[1 - index];
        return [
          [1, bit, scan, 'B', 'R'],
          ...bits.map(value => [scan, value, scan, value, 'R']),
          [scan, 'B', compare, 'B', 'L'],
          [compare, 'B', compare, '1', 'H'],
          [compare, bit, 6, 'B', 'L'],
          [compare, other, 7, 'B', 'L'],
        ];
      }),
      ...bits.map(bit => [6, bit, 6, bit, 'L']),
      [6, 'B', 1, 'B', 'R'],
      ...bits.map(bit => [7, bit, 7, 'B', 'L']),
      [7, 'B', 7, '0', 'H'],
    ],
  },
  equal: {
    name: '一元数比较',
    input: '1110111',
    description: '以 0 分隔两个一元数，成对消去 1。长度相等写 1，否则写 0。0 表示两个零。',
    rules: [
      // Remove one from the left, cross the separator, then remove one from the right.
      [1, '1', 2, 'B', 'R'], [1, '0', 6, 'B', 'R'],
      [2, '1', 2, '1', 'R'], [2, '0', 3, '0', 'R'],
      [3, '1', 3, '1', 'R'], [3, 'B', 4, 'B', 'L'],
      [4, '1', 5, 'B', 'L'], [4, '0', 8, 'B', 'L'],
      [5, '1', 5, '1', 'L'], [5, '0', 5, '0', 'L'], [5, 'B', 1, 'B', 'R'],
      [6, 'B', 6, '1', 'H'], [6, '1', 7, 'B', 'R'],
      [7, '1', 7, 'B', 'R'], [7, 'B', 7, '0', 'H'],
      [8, '1', 8, 'B', 'L'], [8, 'B', 8, '0', 'H'],
    ],
  },
};
