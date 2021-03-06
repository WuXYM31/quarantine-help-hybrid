import { Component, OnInit } from '@angular/core';
import { PickerController } from '@ionic/angular';
import { PickerOptions } from '@ionic/core';
import { FormControl, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-create-request',
  templateUrl: './create-request.page.html',
  styleUrls: ['./create-request.page.scss'],
})
export class CreateRequestPage implements OnInit {
  requestForm: FormGroup;
  deadline: { days: string; hours: string };
  showDaysHours: boolean;
  segmentSelected: any;

  constructor(private pickerCtrl: PickerController) {
    this.requestForm = new FormGroup({
      requestMessage: new FormControl('', [Validators.required]),
    });
  }

  ngOnInit() {
    this.showDaysHours = false;
    this.segmentSelected = 'Medicine';
    this.deadline = { days: '0', hours: '0' };
  }

  segmentChanged(e) {
    this.segmentSelected = e.detail.value;
  }

  async showPicker() {
    this.showDaysHours = true;
    const opts: PickerOptions = {
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Done',
        },
      ],
      columns: [
        {
          name: 'day',
          options: [
            { text: 'Today', value: '0' },
            { text: 'Tomorrow', value: '1' },
            { text: 'In 2 days', value: '2' },
            { text: 'In 3 days', value: '3' },
            { text: 'In 4 days', value: '4' },
            { text: 'In 5 days', value: '5' },
            { text: 'In 6 days', value: '6' },
            { text: 'In 7 days', value: '7' },
            { text: 'In 8 days', value: '8' },
            { text: 'In 9 days', value: '9' },
            { text: 'In 10 days', value: '10' },
          ],
        },
        {
          name: 'hour',
          options: [
            { text: '1 hour', value: '1' },
            { text: '2 hours', value: '2' },
            { text: '3 hours', value: '3' },
            { text: '4 hours', value: '4' },
            { text: '5 hours', value: '5' },
            { text: '6 hours', value: '6' },
            { text: '7 hours', value: '7' },
            { text: '8 hours', value: '8' },
            { text: '9 hours', value: '9' },
            { text: '10 hours', value: '10' },
            { text: '11 hours', value: '11' },
            { text: '12 hours', value: '12' },
            { text: '13 hours', value: '13' },
            { text: '14 hours', value: '14' },
            { text: '15 hours', value: '15' },
            { text: '16 hours', value: '16' },
            { text: '17 hours', value: '17' },
            { text: '18 hours', value: '18' },
            { text: '19 hours', value: '19' },
            { text: '20 hours', value: '20' },
            { text: '21 hours', value: '21' },
            { text: '22 hours', value: '22' },
            { text: '23 hours', value: '23' },
          ],
        },
      ],
    };
    const picker = await this.pickerCtrl.create(opts);
    picker.columns[0].selectedIndex = 2;
    picker.columns[1].selectedIndex = 2;
    picker.present();
    picker.onDidDismiss().then(async ({ data, role }) => {
      if (role === 'cancel') {
        this.showDaysHours = false;
      } else {
        const day = await picker.getColumn('day');
        const hour = await picker.getColumn('hour');
        this.deadline = {
          days: day.options[day.selectedIndex].value,
          hours: hour.options[hour.selectedIndex].value,
        };
      }
    });
  }

  submitRequest() {
    // TODO
    console.log(this.requestForm);
    console.log(this.deadline);
    console.log(this.segmentSelected);
  }
}
