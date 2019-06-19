/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { Component } from 'react';
import { connect } from 'dva';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import Login from 'components/Login';
import styles from './Login.less';
import { Form, Radio } from 'antd';
import FormItem from 'antd/lib/form/FormItem';

const { UserName, Password, Submit } = Login;

const messages = defineMessages({
  button: {
    login: {
      id: 'Login.Button.Login',
      defaultMessage: 'Login',
    },
  },
  placeholder: {
    username: {
      id: 'Login.Placeholder.Username',
      defaultMessage: 'Username',
    },
    password: {
      id: 'Login.Placeholder.Password',
      defaultMessage: 'Password',
    },
  },
});

@connect(({ login, loading }) => ({
  login,
  submitting: loading.effects['login/login'],
}))
class LoginPage extends Component {
  state = {
    value: 'sp',
  };

  onChange = e => {
    this.setState({
      value: e.target.value,
    });
  };

  handleSubmit = (err, values) => {
    if (!err) {
      const valueSubmit = values;
      valueSubmit.orgkind = this.state.value;
      this.props.dispatch({
        type: 'login/login',
        payload: {
          ...valueSubmit,
        },
      });
    }
  };

  render() {
    const { submitting, intl } = this.props;
    return (
      <div className={styles.main}>
        <Login onSubmit={this.handleSubmit}>
          <Form>
            <Form.Item label={'组织类别'}>
              <Radio.Group onChange={this.onChange} value={this.state.value}>
                <Radio value={'sp'}>服务提供方</Radio>
                <Radio value={'tnt'}>租用组织</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
          <UserName name="username" placeholder={intl.formatMessage(messages.placeholder.username)} />
          <Password name="password" placeholder={intl.formatMessage(messages.placeholder.password)} />
          <Submit loading={submitting}><FormattedMessage {...messages.button.login} /></Submit>
        </Login>
      </div>
    );
  }
}

export default injectIntl(LoginPage);
