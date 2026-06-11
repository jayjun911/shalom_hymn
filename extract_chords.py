import cv2
import numpy as np
from PIL import Image, ImageSequence
import json
import sys

def get_chord_regions(image_path, expected_chord_count_per_row):
    # Read GIF using PIL
    pil_img = Image.open(image_path)
    img = np.array(pil_img.convert('L'))
    H, W = img.shape
    
    # Threshold the image (black pixels are text/staff)
    _, thresh = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)
    
    # Find horizontal lines (staff lines)
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel)
    cnts, _ = cv2.findContours(detect_horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    staff_ys = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if w > W * 0.5:  # Must be a long line
            staff_ys.append(y)
            
    staff_ys = sorted(list(set(staff_ys)))
    
    # Group staff lines into systems (typically 5 lines per staff, 2 staves per system)
    systems = []
    current_system = []
    for y in staff_ys:
        if not current_system or y - current_system[-1] < 20:
            current_system.append(y)
        else:
            if len(current_system) >= 5:
                systems.append(current_system)
            current_system = [y]
    if len(current_system) >= 5:
        systems.append(current_system)

    # We want only the Treble staves (the first staff of each pair)
    # Usually systems are grouped in pairs (treble + bass)
    treble_ys = []
    for i in range(len(systems)):
        if i % 2 == 0: # Even indices are treble staves
            treble_ys.append(systems[i][0]) # The top line of the treble staff
            
    # Now look for text above each treble staff
    # We will remove horizontal lines to isolate text
    text_only = cv2.subtract(thresh, detect_horizontal)
    
    # Morphological closing to group letters of a chord (like "Am") together
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5)) 
    text_grouped = cv2.morphologyEx(text_only, cv2.MORPH_CLOSE, kernel)
    
    row_chords = []
    for idx, top_line_y in enumerate(treble_ys):
        # The region above the top line where chords can be
        y_bottom = top_line_y - 2
        y_top = max(0, top_line_y - 50) # Chords are usually within 50px above the staff
        
        region = text_grouped[y_top:y_bottom, 0:W]
        cnts, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        chords_in_row = []
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            if w > 5 and h > 5: # Filter out noise
                # Real coordinates
                real_x = x
                real_y = y_top + y
                
                # Calculate percentage
                pct_x = round((real_x + w/2) / W * 100, 2)
                pct_y = round(real_y / H * 100, 2)
                chords_in_row.append({"x": pct_x, "y": pct_y, "pixel_x": real_x, "pixel_y": real_y, "w": w, "h": h})
        
        # Sort chords left to right
        chords_in_row.sort(key=lambda item: item['x'])
        
        # We need to filter out things that are not chords (like lyrics from the previous line if they bleed in)
        # We know how many chords to expect in this row
        expected_count = expected_chord_count_per_row[idx] if idx < len(expected_chord_count_per_row) else 0
        if expected_count > 0:
            # If we found more blobs than expected, filter by y (chords are usually at the very top or a specific height)
            # or width/height. For now, let's take the largest ones by area if there are too many, or sort by Y.
            if len(chords_in_row) > expected_count:
                # Often lyrics are lower, chords are higher. 
                # Let's sort by Y (ascending, so higher up) and take the top ones? No, they should be roughly on the same Y line.
                # Let's cluster by Y
                pass
                
        row_chords.append(chords_in_row)
        
    return row_chords

if __name__ == "__main__":
    # For hymn 46
    # Page 1: 5, 6, 9, 7 chords per row
    p1_chords = get_chord_regions(r"C:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\images\046-1.gif", [5, 6, 9, 7])
    print("Page 1:")
    for i, row in enumerate(p1_chords):
        print(f"Row {i+1}: {len(row)} blobs found")
        for c in row:
            print(f"  x={c['x']}%, y={c['y']}% (pixel_y={c['pixel_y']})")
            
    # Page 2: 4, 6 chords per row
    p2_chords = get_chord_regions(r"C:\Users\Jay Jun\.gemini\antigravity\scratch\hymn-app\images\046-2.gif", [4, 6])
    print("\nPage 2:")
    for i, row in enumerate(p2_chords):
        print(f"Row {i+1}: {len(row)} blobs found")
        for c in row:
            print(f"  x={c['x']}%, y={c['y']}% (pixel_y={c['pixel_y']})")
