from PIL import Image
import pytesseract
import os
import json
import re

# Tesseract 실행 파일 경로 설정 (Windows 환경 기본 경로)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_tempo_from_gif(image_path, hymn_no):
    if not os.path.exists(image_path):
        return None
    try:
        with Image.open(image_path) as img:
            # 1프레임 추출 및 그레이스케일 변환
            img.seek(0)
            img_gray = img.convert('L')
            w, h = img_gray.size
            
            # 악보 상단 22% 영역 크롭 (템포가 아래쪽에 적힌 경우 유실 방지)
            crop_h = int(h * 0.22)
            top_region = img_gray.crop((0, 0, w, crop_h))
            
            # OCR 인식률 향상을 위한 2배 업스케일링
            top_large = top_region.resize((w * 2, crop_h * 2), Image.Resampling.LANCZOS)
            
            # OCR 실행
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(top_large, config=custom_config)
            
            # 1순위: 등호(=) 뒤에 오는 2~3자리 숫자 중 찬송가 번호와 다른 것 우선 (예: = 88, =92)
            eq_matches = re.findall(r'=\s*(\d{2,3})\b', text)
            for m in eq_matches:
                val = int(m)
                if 40 <= val <= 220 and val != hymn_no:
                    return val
                    
            # 2순위: 템포 키워드(M.M. 등)나 음표 기호 변형(J, d, j, I, i 등) 뒤의 숫자 중 찬송가 번호와 다른 것 우선
            tempo_matches = re.findall(r'\b(?:M\.?M\.?|J|d|j|I|i|q|o|p|t)\s*=?\s*(\d{2,3})\b', text, re.IGNORECASE)
            for m in tempo_matches:
                val = int(m)
                if 40 <= val <= 220 and val != hymn_no:
                    return val

            # 3순위: 등호(=) 뒤의 숫자 (찬송가 번호와 같더라도 허용)
            for m in eq_matches:
                val = int(m)
                if 40 <= val <= 220:
                    return val
                    
            # 4순위: 템포 기호 뒤의 숫자 (찬송가 번호와 같더라도 허용)
            for m in tempo_matches:
                val = int(m)
                if 40 <= val <= 220:
                    return val

            # 5순위: 괄호 안의 숫자 (예: (88), [92])
            paren_matches = re.findall(r'[\(\[\{]\s*(\d{2,3})\s*[\)\]\}]', text)
            for m in paren_matches:
                val = int(m)
                if 40 <= val <= 220:
                    return val

            # 6순위: 일반적인 숫자 중 찬송가 번호와 다른 숫자 우선
            all_numbers = re.findall(r'\b\d{2,3}\b', text)
            for num in all_numbers:
                val = int(num)
                if 40 <= val <= 220 and val != hymn_no:
                    return val

            # 7순위: 최후의 수단으로 임의의 2~3자리 숫자
            for num in all_numbers:
                val = int(num)
                if 40 <= val <= 220:
                    return val
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
    return None

def main():
    print("Starting hymn tempo extraction (Forced Clean Rescan)...")
    tempos_db = {}
    
    # 강제 재스캔을 하되 기존 결과 파일은 준비만 해 둠
    output_file = "tempos.json"
    images_dir = "images"
    
    # 1장부터 558장까지 루프
    for i in range(1, 559):
        base_no = f"{i:03d}"
        
        # 다중 페이지 첫 장(046-1.gif) 혹은 단일 페이지(001.gif) 파일 경로 설정
        img_path = os.path.join(images_dir, f"{base_no}-1.gif")
        if not os.path.exists(img_path):
            img_path = os.path.join(images_dir, f"{base_no}.gif")
            
        if not os.path.exists(img_path):
            continue
            
        print(f"Scanning Hymn {base_no}... ", end="", flush=True)
        tempo = extract_tempo_from_gif(img_path, i)
        if tempo:
            tempos_db[base_no] = tempo
            print(f"Success (BPM: {tempo})")
        else:
            tempos_db[base_no] = None
            print("Failed")
            
        # 중간 저장 (혹시 모를 중단 대비)
        if i % 10 == 0:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(tempos_db, f, indent=2, ensure_ascii=False)
                
    # 최종 결과 저장
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(tempos_db, f, indent=2, ensure_ascii=False)
        
    success_count = sum(1 for v in tempos_db.values() if v is not None)
    print(f"\nExtraction complete! Total scanned: {len(tempos_db)} / Successful: {success_count}")
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    main()
