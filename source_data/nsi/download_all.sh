#!/bin/bash
# Download all NSI open data datasets

BASE="https://www.nsi.bg/opendata"
DEST="C:/Users/vikto/Downloads/nsi"

# All 131 dataset IDs from DATASETS_CHECKLIST.md
ALL_IDS=(1169 1942 1130 1139 1678 1893 818 819 1125 1175 1214 1211 1209 939 1099 1176 1212 1210 1722 937 922 1098 1101 1135 1133 1124 1428 1129 1127 1108 1123 908 1264 1265 1260 1259 1263 1262 365 1093 1096 1106 1110 1150 1117 1119 1112 1103 1166 1120 1720 1011 1116 1187 1190 385 1183 1161 1155 1158 1217 1163 1157 1164 1153 612 1341 1340 199 202 176 684 189 212 169 251 263 273 259 319 325 324 320 302 305 304 307 315 312 309 242 295 301 296 297 298 235 300 470 428 727 690 715 107 118 1219 1206 1105 860 629 868 865 1274 654 454 1363 240 1227 159 844 873 1050 1200 781 646 785 434 1046 772 521)

downloaded=0
skipped=0
failed=0

for id in "${ALL_IDS[@]}"; do
    dir="$DEST/$id"

    # Skip if already downloaded (has at least 3 files)
    if [ -d "$dir" ] && [ "$(ls "$dir" 2>/dev/null | wc -l)" -ge 3 ]; then
        echo "SKIP $id (already exists)"
        skipped=$((skipped + 1))
        continue
    fi

    mkdir -p "$dir"

    # Download data CSV
    data_file=$(curl -sI "$BASE/getopendata.php?l=en&id=$id" 2>/dev/null | grep -i 'Content-Disposition' | sed 's/.*filename=//;s/\r//')
    if [ -z "$data_file" ]; then
        data_file="data-$id.csv"
    fi
    curl -s -o "$dir/$data_file" "$BASE/getopendata.php?l=en&id=$id"

    # Download fields CSV
    fields_file=$(curl -sI "$BASE/getfields.php?l=en&id=$id" 2>/dev/null | grep -i 'Content-Disposition' | sed 's/.*filename=//;s/\r//')
    if [ -z "$fields_file" ]; then
        fields_file="fields-$id.csv"
    fi
    curl -s -o "$dir/$fields_file" "$BASE/getfields.php?l=en&id=$id"

    # Download codelists CSV
    codelists_file=$(curl -sI "$BASE/getcodelists.php?l=en&id=$id" 2>/dev/null | grep -i 'Content-Disposition' | sed 's/.*filename=//;s/\r//')
    if [ -z "$codelists_file" ]; then
        codelists_file="codelists-$id.csv"
    fi
    curl -s -o "$dir/$codelists_file" "$BASE/getcodelists.php?l=en&id=$id"

    # Verify files downloaded
    file_count=$(ls "$dir" 2>/dev/null | wc -l)
    if [ "$file_count" -ge 3 ]; then
        echo "OK   $id ($data_file) - $file_count files"
        downloaded=$((downloaded + 1))
    else
        echo "FAIL $id - only $file_count files"
        failed=$((failed + 1))
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "Downloaded: $downloaded"
echo "Skipped:    $skipped"
echo "Failed:     $failed"
echo "Total:      ${#ALL_IDS[@]}"
