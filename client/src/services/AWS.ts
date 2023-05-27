import { AttributeFilter, KendraClient, QueryCommand, QueryCommandInput, SortingConfiguration, SubmitFeedbackCommand } from "@aws-sdk/client-kendra";
import { S3Client } from "@aws-sdk/client-s3";
import { CREDENTIALS_FILE_NAME, CREDENTIALS_FILE_PATH } from "./constants";

const _loadingErrors = [];

// If you get an error here, please revisit the Getting Started section of the README
let config = null;
try {
  const response = await fetch(`./${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  config = await response.json();
} catch (e) {
  console.log(e);
  _loadingErrors.push(
    `${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME} could not be loaded. See Getting Started in the README.`
  );
}

if (config) {
  if (!config.accessKeyId) {
    _loadingErrors.push(
      `There is no accessKeyId provided in${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`
    );
  }
  if (!config.secretAccessKey) {
    _loadingErrors.push(
      `There is no secretAccessKey provided in ${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`
    );
  }
  if (!config.region) {
    _loadingErrors.push(
      `There is no region provided in ${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`
    );
  }
  if (!config.indexId || config.indexId.length === 0) {
    _loadingErrors.push(
      `There is no indexId provided in ${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`
    );
  }
  if (!config.serverUrl) {
    _loadingErrors.push(
      `There is no serverUrl provided in ${CREDENTIALS_FILE_PATH}/${CREDENTIALS_FILE_NAME}`
    );
  }
}

const hasErrors = _loadingErrors.length > 0;
if (hasErrors) {
  console.error(JSON.stringify(_loadingErrors));
}

export const initAWSError = _loadingErrors;

export const indexId = config ? config.indexId : undefined;
export const serverUrl = config ? config.serverUrl : undefined;

export const kendraClient = !hasErrors
  ? new KendraClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }
  })
  : undefined;

export enum Relevance {
  Relevant = "RELEVANT",
  NotRelevant = "NOT_RELEVANT",
  Click = "CLICK",
}

export async function submitFeedback(
  relevance: Relevance, // feedbackする関連度
  resultId: string, // feedbackするアイテム
  queryId: string // Query id
) {

  const command = (relevance === Relevance.Click)
    ? new SubmitFeedbackCommand({
      IndexId: indexId,
      QueryId: queryId,
      ClickFeedbackItems: [
        {
          ResultId: resultId,
          ClickTime: new Date(),
        },
      ],
    })
    : new SubmitFeedbackCommand({
      IndexId: indexId,
      QueryId: queryId,
      RelevanceFeedbackItems: [
        {
          ResultId: resultId,
          RelevanceValue: relevance
        },
      ],
    });

  // Feedbackを送信
  await kendraClient?.send(command)
}

export function getKendraQuery(
  queryText: string,
  attributeFilter: AttributeFilter,
  sortingConfiguration: SortingConfiguration | undefined
): QueryCommandInput {
  return {
    IndexId: indexId,
    PageNumber: 1,
    PageSize: 10,
    QueryText: queryText,
    AttributeFilter: attributeFilter,
    SortingConfiguration: sortingConfiguration,
  }
}

export function overwriteQuery(
  prevQuery: QueryCommandInput,
  newAttributeFilter: AttributeFilter,
  newSortingConfiguration: SortingConfiguration | undefined
): QueryCommandInput {
  return  {
    ...prevQuery,
    AttributeFilter: newAttributeFilter,
    SortingConfiguration: newSortingConfiguration,
  }
}


export async function kendraQuery(param: QueryCommandInput) {
  return kendraClient?.send(new QueryCommand(param));
}


export const s3Client = !hasErrors
  ? new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }
  })
  : undefined;
