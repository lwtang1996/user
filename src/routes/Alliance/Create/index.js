import React, { PureComponent } from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;

@Form.create()
export default class CreateAlliance extends PureComponent {
  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <div>
          <FormItem label={'联盟名称'}>
            {getFieldDecorator('name', {
              initialValue: '',
              rules: [
                {
                  required: true,
                  message: '请输入名称',
                },
              ],
            })(<Input placeholder={''} />)}
          </FormItem>
      </div>
    );
  }
}