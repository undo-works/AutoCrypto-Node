import AWSWrapper from "./AWSWrapper";
require("dotenv").config();

export class SsmParameter extends AWSWrapper {
  /**
   * AWS SSMのインスタンス
   */
  ssm = new this.aws.SSM();

  /**
   * SSMパラメータから環境変数を取得
   * @param parameterName - パラメタ名
   * @returns The value of the parameter as a string.
   */
  public async getSsmParameter(parameterName: string): Promise<string> {
    try {
      const result = await this.ssm
        .getParameter({
          Name: parameterName,
          WithDecryption: true,
        })
        .promise();

      if (!result.Parameter || !result.Parameter.Value) {
        throw new Error(
          `Parameter ${parameterName} not found or has no value.`
        );
      }

      return result.Parameter.Value ?? "";
    } catch (error) {
      console.error(`Error retrieving parameter ${parameterName}:`, error);
      throw error;
    }
  }
}
