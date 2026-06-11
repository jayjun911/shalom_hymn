import cv2
import numpy as np
import pytesseract
import os
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_tempo_from_image(image_path):
    if not os.path.exists(image_path):
        return None, "File not found"
    
    # 이미지 로드
    img = cv2.imread(image_path)
    if img is None:
        return None, "Failed to read image"
        
    h, w, _ = img.shape
    # 악보의 상단 약 15% 영역만 크롭 (템포 표기 영역)
    crop_h = int(h * 0.15)
    top_region = img[0:crop_h, 0:w]
    
    # 전처리: 그레이스케일 변환 후 Otsu 이진화
    gray = cv2.cvtColor(top_region, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    
    # OCR 인식
    # 영어 숫자가 포함된 문자를 정확하게 인식하도록 설정
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(thresh, config=custom_config)
    
    # 템포 숫자 매칭 (예: ♩= 92, M.M = 100, ♩ =88, 92 등)
    # 악보 번호(1~3자리)가 같이 인식될 수 있으므로, 템포의 일반적인 범위인 40~250 사이의 숫자를 검색
    # 보통 템포는 ♩= 92 형태로 등호(=)나 알파벳 뒤에 나오므로 이를 고려하여 매칭
    matches = re.findall(r'(?:[=M.m]|\b)\s*(\d{2,3})\b', text)
    
    tempos = []
    for m in matches:
        val = int(m)
        if 40 <= val <= 220:
            tempos.append(val)
            
    if tempos:
        # 가장 그럴듯한 템포 값을 반환 (보통 첫 번째 검출값)
        return tempos[0], f"Found: {tempos} in text: '{text.strip().replace(chr(10), ' ')}'"
    
    # 그냥 텍스트 전체에서 숫자가 있는지 재시도
    numbers = re.findall(r'\b\d{2,3}\b', text)
    for num in numbers:
        val = int(num)
        if 40 <= val <= 220:
            return val, f"Found in general numbers: {num} in text: '{text.strip()}'"
            
    return None, f"Not found. OCR text: '{text.strip()}'"

if __name__ == "__main__":
    print("Testing Tesseract OCR for tempo extraction...")
    for i in range(1, 6):
        base_no = str(i).padStart(3, '0') if hasattr(str, 'padStart') else f"{i:03d}"
        img_path = f"images/{base_no}.gif"
        tempo, log = extract_tempo_from_image(img_path)
        print(f"Hymn {base_no}: Tempo = {tempo} ({log})")
