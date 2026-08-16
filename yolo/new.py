from ultralytics import YOLO
import shutil
from validate import validate

path_to_image = "images/"
destination_path = "output/"

correpted_images = validate(image_folder=path_to_image)
print(correpted_images)

model = YOLO("weights/best_yolov8.pt")

result = model.predict(source=path_to_image)
counter = 0
print("\n\n")
print("=" * 80)
for r in result:
    counter += 1
    file_path = r.path
    print(f"Image_no : {counter} \nPath : {file_path}")

    if not r.boxes:
        print(f"Image_no : {counter} | Detected: No tiger detected | Confidence: 0%")
        shutil.move(file_path, destination_path + "quarentine")
        print("=" * 80)
        continue

    percentage = 0.00

    for box in r.boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        class_name = r.names[cls_id]
        cur_percentage = conf * 100
        percentage = max(cur_percentage, percentage)
        print(f"Detected: {class_name} | Confidence: {cur_percentage:.2f}%")

    try:
        if percentage > 60.00:
            shutil.move(file_path, destination_path + "retain")
        elif percentage <= 60.00 and percentage >= 30.00:
            shutil.move(file_path, destination_path + "review")
        elif percentage < 30.00 and percentage >= 0.00:
            shutil.move(file_path, destination_path + "quarentine")
    except Exception as e:
        print(e)

    print("=" * 80)