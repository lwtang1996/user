import React, { PureComponent } from 'react';
import { Form, Input, Select, Button } from 'antd';
const FormItem = Form.Item;

@Form.create()
export default class CreateAlliance extends PureComponent {
  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if(!err) {
        console.log(values);
      }
    });
    //console.log({alliance_name});
  };
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol:{
        xs:{span:8},
        sm:{span:8},
      },
      wrapperCol:{
        xs:{span:8},
        sm:{span:8},
      },
    };
    const consensusPolicies = ['solo', 'kafka'];
    const Option=Select.Option;
    const consensusOptions = consensusPolicies.map(
      (consensusPolicy) => (
        <Option value={consensusPolicy} >{consensusPolicy}</Option>
      ) 
    );
    const chainSizes = [2, 4];
    const chainSizeOptions = chainSizes.map(
      (chainSize) => (
        <Option value={chainSize}>{chainSize}</Option>
      )
    );

    return (
      <div >
        <Form onSubmit={this.handleSubmit}>
          <FormItem {...formItemLayout} label={'联盟名称'}>
              {getFieldDecorator('alliance_name', {
                initialValue: '',
                rules: [
                  {
                    required: true,
                    message: '请输入名称',
                  },
                ],
              })(<Input placeholder={''} />)}
            </FormItem>
            <FormItem {...formItemLayout} label={'共识策略'}>
              {getFieldDecorator('consensus_policy', {
                initialValue: consensusPolicies[0],
                rules: [
                  {
                    required: true,
                    message: '请输入共识策略',
                  },
                ],
              })(<Select>{consensusOptions}</Select>)}
            </FormItem>
            <FormItem {...formItemLayout} label={'联盟根域名'}>
              {getFieldDecorator('domain', {
                initialValue: '',
                rules: [
                  {
                    required: true,
                    message: '请输入联盟根域名',
                  },
                ],
              })(<Input placeholder={'edu.cn'}/>)}
            </FormItem>
            <FormItem {...formItemLayout} label={'共识节点数目'}>
              {getFieldDecorator('chain_size', {
                initialValue: chainSizes[0],
                rules: [
                  {
                    required: true,
                    message: '请输入节点数目',
                  },
                ],
              })(<Select>{chainSizeOptions}</Select>)}
            </FormItem>
            <FormItem >
              <Button type='primary' htmlType='submit' style={{marginLeft:480}}>创建联盟</Button>
            </FormItem>
        </Form>

      </div>
    );
  }
}