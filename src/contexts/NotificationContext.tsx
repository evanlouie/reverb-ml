import React from "react";

export interface INotificationState {
  isOpen: boolean;
  text: string;
  notify: (message: string) => Promise<any>;
  close: () => Promise<any>;
}

export class NotificationContext extends React.PureComponent<{}, INotificationState> {
  private static readonly defaultState: INotificationState = {
    isOpen: false,
    text: "",
    close: async () => null,
    notify: async (_: string) => null,
  };

  private static context = React.createContext(NotificationContext.defaultState);

  public static get Consumer() {
    return this.context.Consumer;
  }

  public state: INotificationState = {
    ...NotificationContext.defaultState,
    close: async () => this.setState({ isOpen: false }),
    notify: async (text: string) => this.setState({ text, isOpen: true }),
  };

  public render() {
    const { Provider } = NotificationContext.context;
    return <Provider value={this.state}>{this.props.children}</Provider>;
  }
}
