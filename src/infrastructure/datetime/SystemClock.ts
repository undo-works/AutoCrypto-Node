import moment = require("moment-timezone");

export class SystemClock {
  /**
   * 現在時刻を取得する
   * @returns 現在時刻
   */
  public static getTimeStamp(): string {
    const jpYear = moment().tz("Asia/Tokyo").format("YYYY");
    const jpMonth = moment().tz("Asia/Tokyo").format("MM");
    const jpDate = moment().tz("Asia/Tokyo").format("DD");
    const jpHour = moment().tz("Asia/Tokyo").format("HH");
    const jpMin = moment().tz("Asia/Tokyo").format("mm");
    const strTime = jpYear + "/" + jpMonth + "/" + jpDate + " " + jpHour + ":" + jpMin;
    console.log(strTime);
    return strTime;
  }

  /**
 * 現在日時を取得する
 * @returns 現在日時
 */
  public static getToday(): string {
    const jpYear = moment().tz("Asia/Tokyo").format("YYYY");
    const jpMonth = moment().tz("Asia/Tokyo").format("MM");
    const jpDate = moment().tz("Asia/Tokyo").format("DD");
    const strTime = jpYear + "/" + jpMonth + "/" + jpDate;
    return strTime;
  }
}
