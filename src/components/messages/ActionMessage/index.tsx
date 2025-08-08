import React from 'react';
import { ActionMessage } from '../../../types.js';
import { ACTION_TYPE } from '../../../utils/constants.js';
import { DescriptionAction } from './DescriptionAction.js';
import { FileUpdateAction } from './FileUpdateAction.js';
import { CodeDiffAction } from './CodeDiffAction.js';
import { NestedAction } from './NestedAction.js';

interface ActionMessageComponentProps {
  message: ActionMessage;
}

export function ActionMessageComponent({
  message,
}: ActionMessageComponentProps) {
  switch (message.actionType) {
    case ACTION_TYPE.DESCRIPTION:
      return <DescriptionAction message={message} />;
    case ACTION_TYPE.FILE_UPDATE:
      return <FileUpdateAction message={message} />;
    case ACTION_TYPE.CODE_DIFF:
      return <CodeDiffAction message={message} />;
    case ACTION_TYPE.NESTED:
      return <NestedAction message={message} />;
    default:
      return <DescriptionAction message={message} />;
  }
}

export * from './DescriptionAction.js';
export * from './FileUpdateAction.js';
export * from './CodeDiffAction.js';
export * from './NestedAction.js';
