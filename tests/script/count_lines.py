#!/usr/bin/env python3
"""
代码行数统计脚本
统计项目中各种文件的代码行数，按文件类型和目录分组
"""

import os
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple


# 常见的代码文件扩展名
CODE_EXTENSIONS = {
    'TypeScript': ['.ts', '.tsx'],
    'JavaScript': ['.js', '.jsx'],
    'Python': ['.py'],
    'CSS': ['.css', '.scss', '.sass', '.less'],
    'HTML': ['.html', '.htm'],
    'JSON': ['.json'],
    'Markdown': ['.md'],
    'Shell': ['.sh', '.bash', '.zsh'],
    'SQL': ['.sql'],
    'YAML': ['.yaml', '.yml'],
    'XML': ['.xml'],
}

# 需要排除的目录
EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'coverage',
    '.vscode',
    '.cursor',
    'test-results',
    'e2e',
}

# 需要排除的文件
EXCLUDE_FILES = {
    'tsconfig.tsbuildinfo',
    'pnpm-lock.yaml',
    '.DS_Store',
}


def count_lines_in_file(file_path: Path) -> Tuple[int, int, int]:
    """
    统计文件中的总行数、代码行数和空白行数

    Args:
        file_path: 文件路径

    Returns:
        (总行数, 代码行数, 空白行数)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        total_lines = len(lines)
        blank_lines = sum(1 for line in lines if line.strip() == '')
        code_lines = total_lines - blank_lines

        return total_lines, code_lines, blank_lines
    except (UnicodeDecodeError, PermissionError):
        # 如果无法读取文件，返回0
        return 0, 0, 0


def get_file_type(file_path: Path) -> str:
    """
    根据文件扩展名获取文件类型

    Args:
        file_path: 文件路径

    Returns:
        文件类型字符串
    """
    suffix = file_path.suffix.lower()

    for file_type, extensions in CODE_EXTENSIONS.items():
        if suffix in extensions:
            return file_type

    return 'Other'


def should_exclude_dir(dir_name: str) -> bool:
    """判断目录是否应该被排除"""
    return dir_name in EXCLUDE_DIRS or dir_name.startswith('.')


def should_exclude_file(file_name: str) -> bool:
    """判断文件是否应该被排除"""
    return file_name in EXCLUDE_FILES


def scan_directory(root_path: Path) -> Dict[str, List[Dict]]:
    """
    扫描目录，收集所有代码文件信息

    Args:
        root_path: 根目录路径

    Returns:
        按目录分组的文件信息字典
    """
    result = defaultdict(list)

    for file_path in root_path.rglob('*'):
        # 跳过目录
        if file_path.is_dir():
            continue

        # 检查是否应该排除此文件
        parts = file_path.parts
        if any(should_exclude_dir(part) for part in parts):
            continue

        if should_exclude_file(file_path.name):
            continue

        # 只统计代码文件
        if file_path.suffix.lower() not in {ext for exts in CODE_EXTENSIONS.values() for ext in exts}:
            continue

        # 统计行数
        total, code, blank = count_lines_in_file(file_path)

        # 获取相对路径
        rel_path = file_path.relative_to(root_path)

        # 获取文件类型
        file_type = get_file_type(file_path)

        # 获取所在目录
        dir_path = str(rel_path.parent)
        if dir_path == '.':
            dir_path = 'root'

        result[dir_path].append({
            'name': file_path.name,
            'path': str(rel_path),
            'type': file_type,
            'total_lines': total,
            'code_lines': code,
            'blank_lines': blank,
        })

    return result


def print_statistics(files_by_dir: Dict[str, List[Dict]]):
    """打印统计结果"""

    # 按文件类型汇总
    stats_by_type = defaultdict(lambda: {'files': 0, 'total': 0, 'code': 0, 'blank': 0})

    # 收集所有文件
    all_files = []
    total_stats = {'files': 0, 'total': 0, 'code': 0, 'blank': 0}

    for dir_path, files in files_by_dir.items():
        for file_info in files:
            file_type = file_info['type']
            stats = stats_by_type[file_type]

            stats['files'] += 1
            stats['total'] += file_info['total_lines']
            stats['code'] += file_info['code_lines']
            stats['blank'] += file_info['blank_lines']

            total_stats['files'] += 1
            total_stats['total'] += file_info['total_lines']
            total_stats['code'] += file_info['code_lines']
            total_stats['blank'] += file_info['blank_lines']

            all_files.append(file_info)

    print("=" * 100)
    print("代码行数统计报告")
    print("=" * 100)
    print()

    # 打印按文件类型统计
    print("📊 按文件类型统计:")
    print("-" * 100)
    print(f"{'文件类型':<15} {'文件数':<8} {'总行数':<10} {'代码行数':<10} {'空白行数':<10}")
    print("-" * 100)

    for file_type in sorted(stats_by_type.keys()):
        stats = stats_by_type[file_type]
        print(f"{file_type:<15} {stats['files']:<8} {stats['total']:<10} {stats['code']:<10} {stats['blank']:<10}")

    print("-" * 100)
    print(f"{'总计':<15} {total_stats['files']:<8} {total_stats['total']:<10} {total_stats['code']:<10} {total_stats['blank']:<10}")
    print()

    # 打印每个文件的详细统计
    print("📄 每个文件的代码行数:")
    print("-" * 100)
    print(f"{'文件路径':<60} {'类型':<12} {'总行数':<8} {'代码行数':<8} {'空白行数':<8}")
    print("-" * 100)

    # 按代码行数排序
    sorted_files = sorted(all_files, key=lambda x: x['code_lines'], reverse=True)

    for file_info in sorted_files:
        # 截断过长的路径
        path = file_info['path']
        display_path = path if len(path) <= 58 else '...' + path[-55:]
        print(f"{display_path:<60} {file_info['type']:<12} {file_info['total_lines']:<8} {file_info['code_lines']:<8} {file_info['blank_lines']:<8}")

    print()
    print("=" * 100)


def main():
    """主函数"""
    # 获取当前目录
    root_path = Path.cwd()

    print(f"🔍 扫描目录: {root_path}")
    print()

    # 扫描目录
    files_by_dir = scan_directory(root_path)

    # 打印统计结果
    print_statistics(files_by_dir)


if __name__ == '__main__':
    main()
