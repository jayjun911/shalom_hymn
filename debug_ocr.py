from PIL import Image
import pytesseract
import os
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def debug_ocr_for_hymn(hymn_no):
    base_no = f"{hymn_no:03d}"
    img_path = f"images/{base_no}-1.gif"
    if not os.path.exists(img_path):
        img_path = f"images/{base_no}.gif"
        
    if not os.path.exists(img_path):
        print(f"Hymn {base_no}: Image file not found")
        return
        
    try:
        with Image.open(img_path) as img:
            img.seek(0)
            img_gray = img.convert('L')
            w, h = img_gray.size
            
            crop_h = int(h * 0.22)
            top_region = img_gray.crop((0, 0, w, crop_h))
            
            top_large = top_region.resize((w * 2, crop_h * 2), Image.Resampling.LANCZOS)
            
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(top_large, config=custom_config)
            
            print(f"\n=================== Hymn {base_no} Raw OCR ===================")
            print(text.strip())
            print("==========================================================")
    except Exception as e:
        print(f"Hymn {base_no} Error: {e}")

if __name__ == "__main__":
    # 실패한 곡 몇 개만 지정하여 OCR 텍스트 점검
    failed_hymns = [1, 2, 9, 40, 62, 71, 83]
    for num in failed_hymns:
        debug_ocr_for_hymn(num)
