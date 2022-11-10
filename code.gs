// Nature Remo Cloud API の URL
const NATURE_REMO_CLOUD_API_URL = "https://api.nature.global/1/appliances";
// Nature Remo Cloud API の アクセストークン
const NATURE_REMO_CLOUD_API_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("NATURE_REMO_CLOUD_API_ACCESS_TOKEN");

// Ambient API の URL
const AMBIENT_API_URL = "http://ambidata.io/api/v2/channels/" + PropertiesService.getScriptProperties().getProperty("AMBIENT_CHANNEL_ID") + "/data";
// Ambient の WriteKey
const AMBIENT_WRITE_KEY = PropertiesService.getScriptProperties().getProperty("AMBIENT_WRITE_KEY");

// スプレッドシート の ID
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");

function myFunction() {
  // Nature Remo Cloud API から Nature Remo E Lite の情報を取得
  const nremoResponse = UrlFetchApp.fetch(
    NATURE_REMO_CLOUD_API_URL,
    { method: "get", headers: { authorization: "Bearer " + NATURE_REMO_CLOUD_API_ACCESS_TOKEN }}
  );
  console.log("Nature Remo Cloud API Response: ", nremoResponse.getResponseCode());
  const nremoJson = JSON.parse(nremoResponse.getContentText());

  // スマートメーターに関する情報を抽出
  const smInfo = {};
  nremoJson[0]["smart_meter"]["echonetlite_properties"].forEach(prop => {
    smInfo[prop["name"]] = prop["val"];
  });
  console.log("SmartmeterInfo:", smInfo);

  // 月単位にシート作成
  const now = new Date()
  const yyyymm = now.getFullYear() + ("00" + (now.getMonth() + 1)).slice(-2);
  const spreadSheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadSheet.getSheetByName(yyyymm);
  if (!sheet) {
    sheet = spreadSheet.insertSheet(yyyymm);
    sheet.appendRow(["時刻", "消費電力(W)", "積算電力(kWh)"]);
    sheet.getRange(1, 1, 1, 3).setHorizontalAlignment("center").setBorder(null, null, true, null, null, null);
  }

  const instant = Number(smInfo["measured_instantaneous"]); // 瞬時電力(W)
  const cumulate = Number(smInfo["normal_direction_cumulative_electric_energy"]) / 10; // 積算電力(kWh)

  // 行追記
  sheet.appendRow([now, instant, cumulate]);

  // Ambientにデータ送信
  const ambientSendData = { writeKey: AMBIENT_WRITE_KEY, d1: instant, d2: cumulate };
  console.log("Ambient Send Data:", ambientSendData);

  const ambientResponse = UrlFetchApp.fetch(
    AMBIENT_API_URL,
    { method: "post", "contentType": "application/json", payload: JSON.stringify(ambientSendData) }
  );
  console.log("Ambient API Response: ", ambientResponse.getResponseCode());
}
