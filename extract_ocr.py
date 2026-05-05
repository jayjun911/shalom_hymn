import cv2
import numpy as np
import pytesseract
import json
import os
import re

# Tesseract 실행 파일 경로 설정 (Windows 환경)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def is_valid_chord(text):
    pattern = r'^[A-G][b#]?(m|min|maj)?(7|dim|aug)?$'
    return bool(re.match(pattern, text.strip()))

def is_tempo(text):
    pattern = r'\d{2,3}'
    match = re.search(pattern, text)
    if match:
        return int(match.group())
    return None

def process_hymn(hymn_no, image_path, page_idx):
    if not os.path.exists(image_path):
        return None

    cap = cv2.VideoCapture(image_path)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        print(f"Failed to load image: {image_path}")
        return None

    # 악보는 흑백이므로 단순 이진화 처리
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    height, width = thresh.shape
    
    # 1. 5선지(가로선) 찾기
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (width // 10, 1))
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    
    contours, _ = cv2.findContours(detect_horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    lines_y = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > width * 0.5:
            lines_y.append(y)
    lines_y.sort()

    staves = []
    current_staff = []
    for y in lines_y:
        if not current_staff:
            current_staff.append(y)
        else:
            if y - current_staff[-1] < 15:
                current_staff.append(y)
            else:
                staves.append(current_staff)
                current_staff = [y]
    if current_staff:
        staves.append(current_staff)

    # 모든 오선지에 대해 위쪽 영역을 탐색
    # (가사 영역에서 우연히 A, C, G 등으로 읽히는 경우는 정규식과 whitelist로 최소화)
    treble_staves = valid_staves

    # 가로선 제거 후 텍스트만 남김
    text_only = cv2.subtract(thresh, detect_horizontal)
    
    # 코드는 가로로 긴 단어 형태이므로 가로로 약간 팽창
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (8, 3))
    dilated = cv2.dilate(text_only, kernel, iterations=1)
    
    text_contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    chords = []
    tempo = None
    base_key = None

    # 디버깅용 컬러 이미지 복사본
    debug_img = frame.copy()

    for cnt in text_contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # 모든 윤곽선을 얇은 파란색 선으로 그림
        cv2.rectangle(debug_img, (x, y), (x+w, y+h), (255, 0, 0), 1)
        
        if w < 5 or h < 5 or w > 150 or h > 60:
            continue
            
        matched_staff = None
        for staff in treble_staves:
            staff_top = staff[0]
            if staff_top - 90 < y + h < staff_top - 2:
                matched_staff = staff
                break
                
        is_top_region = False
        if treble_staves and y < treble_staves[0][0] - 30:
            is_top_region = True

        if not matched_staff and not is_top_region:
            continue

        pad = 4
        x1, y1 = max(0, x-pad), max(0, y-pad)
        x2, y2 = min(width, x+w+pad), min(height, y+h+pad)
        
        roi = gray[y1:y2, x1:x2]
        roi_large = cv2.resize(roi, (0,0), fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        _, roi_thresh = cv2.threshold(roi_large, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        
        custom_config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwxyz0123456789=#'
        text = pytesseract.image_to_string(roi_thresh, config=custom_config).strip()
        text = text.replace(' ', '')
        if text:
            print(f"[{page_idx}] Raw OCR at x={x}, y={y}: '{text}'")

        if matched_staff and text:
            chord_text = text.capitalize()
            if chord_text.endswith('M'): chord_text = chord_text[:-1] + 'm'
            if is_valid_chord(chord_text):
                chord_x_pct = round((x / width) * 100, 1)
                chord_y_pct = round((y / height) * 100, 1)
                chords.append({
                    "p": page_idx,
                    "x": chord_x_pct,
                    "y": chord_y_pct,
                    "t": chord_text
                })
                if not base_key:
                    base_key = re.match(r'^[A-G][b#]?', chord_text).group()
                # 인식된 코드는 두꺼운 녹색 선으로 그림
                cv2.rectangle(debug_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                cv2.putText(debug_img, chord_text, (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        if is_top_region and text:
            match = re.search(r'[A-Za-z=]\s*(\d{2,3})', text)
            if match:
                tempo = int(match.group(1))

    # 오선지 위치에 빨간 선 긋기
    for staff in treble_staves:
        cv2.line(debug_img, (0, staff[0]), (width, staff[0]), (0, 0, 255), 1)

    cv2.imwrite(f"debug_rects_{page_idx}.png", debug_img)
    return chords, tempo, base_key

if __name__ == "__main__":
    hymn_no = "046"
    print(f"Processing Hymn {hymn_no}...")
    
    all_chords = []
    final_tempo = None
    final_key = None
    
    # 1페이지, 2페이지 순차 처리
    for page in [1, 2]:
        img_path = f"images/{hymn_no}-{page}.gif"
        if page == 1 and not os.path.exists(img_path):
            img_path = f"images/{hymn_no}.gif"
            
        if not os.path.exists(img_path):
            if page == 1:
                print(f"Image not found: {img_path}")
            continue
            
        print(f"Analyzing {img_path} with OCR...")
        chords, tempo, base_key = process_hymn(hymn_no, img_path, page)
        
        if chords:
            all_chords.extend(chords)
        if tempo and not final_tempo:
            final_tempo = tempo
        if base_key and not final_key:
            final_key = base_key

    # X축 기준으로 정렬 (필요시 Y축도 함께)
    all_chords.sort(key=lambda c: (c['p'], c['y'], c['x']))

    out_data = {
        "key": final_key or "C",
        "tempo": final_tempo or 80,
        "chords": all_chords
    }
    
    out_dir = "chords_ocr"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{hymn_no}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
        
    print(f"Extraction complete! Saved to {out_path}")
    print(json.dumps(out_data, indent=2))
