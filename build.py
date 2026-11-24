import os
import shutil
import zipfile

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
CHROME_DIR = os.path.join(DIST_DIR, 'chrome')
FIREFOX_DIR = os.path.join(DIST_DIR, 'firefox')

COMMON_DIRS = ['icons', 'lib', 'content', 'popup']
COMMON_FILES = ['background.js']

def clean():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(CHROME_DIR, exist_ok=True)
    os.makedirs(FIREFOX_DIR, exist_ok=True)

def copy_common(target_dir):
    for d in COMMON_DIRS:
        src = os.path.join(ROOT_DIR, d)
        dst = os.path.join(target_dir, d)
        if os.path.exists(src):
            shutil.copytree(src, dst)
    for f in COMMON_FILES:
        src = os.path.join(ROOT_DIR, f)
        dst = os.path.join(target_dir, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)

def make_zip(source_dir, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

def build_chrome():
    copy_common(CHROME_DIR)
    shutil.copy2(
        os.path.join(ROOT_DIR, 'manifest.chrome.json'),
        os.path.join(CHROME_DIR, 'manifest.json')
    )
    zip_path = os.path.join(DIST_DIR, 'ym-downloader-chrome.zip')
    make_zip(CHROME_DIR, zip_path)

def build_firefox():
    copy_common(FIREFOX_DIR)
    shutil.copy2(
        os.path.join(ROOT_DIR, 'manifest.json'),
        os.path.join(FIREFOX_DIR, 'manifest.json')
    )
    zip_path = os.path.join(DIST_DIR, 'ym-downloader-firefox.zip')
    make_zip(FIREFOX_DIR, zip_path)

if __name__ == '__main__':
    clean()
    build_chrome()
    build_firefox()
    print('OK')
