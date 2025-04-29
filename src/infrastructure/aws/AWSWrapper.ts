import * as AWS from "aws-sdk";
import 'dotenv/config'

export default class AWSWrapper {

  /**
   * AWS SDKのインスタンス
   */
  protected aws = AWS;

  constructor() {
    this.aws.config.update({
      region: process.env.AWS_SSM_REGION,
      accessKeyId: process.env.AWS_SSM_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SSM_PRIVATE_KEY,
    });
  }
}
